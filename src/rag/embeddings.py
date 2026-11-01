"""Embedding client over the same OpenAI-compatible endpoint as chat."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Protocol, Sequence

from config import LLMSettings


class EmbeddingError(Exception):
    """Embeddings endpoint failed or returned a vector count other than ``len(texts)``."""


class EmbeddingClient(Protocol):
    def embed(self, texts: Sequence[str]) -> list[tuple[float, ...]]:
        """Return one vector per input, same order. Empty ``texts`` returns ``[]``."""


class OpenAICompatibleEmbeddings:
    """POST ``{base_url}/embeddings``. Model name comes from ``RAGSettings``, not chat."""

    def __init__(self, settings: LLMSettings, model: str) -> None:
        self._settings = settings
        self._model = model

    def embed(self, texts: Sequence[str]) -> list[tuple[float, ...]]:
        if len(texts) == 0:
            return []
        url = self._settings.base_url.rstrip("/") + "/embeddings"
        payload = {"model": self._model, "input": list(texts)}
        body = _post_json(url, payload, self._settings, EmbeddingError)
        data = body.get("data")
        if not isinstance(data, list):
            raise EmbeddingError("embeddings response has no data")
        ordered: list[tuple[int, tuple[float, ...]]] = []
        for index, item in enumerate(data):
            if not isinstance(item, dict) or not isinstance(item.get("embedding"), list):
                raise EmbeddingError("embeddings item is invalid")
            position = item.get("index", index)
            if not isinstance(position, int):
                raise EmbeddingError("embeddings item index is invalid")
            vector = tuple(float(component) for component in item["embedding"])
            ordered.append((position, vector))
        ordered.sort(key=lambda pair: pair[0])
        vectors = [vector for _, vector in ordered]
        if len(vectors) != len(texts):
            raise EmbeddingError("embeddings response length does not match the input")
        return vectors


def _post_json(url: str, payload: dict[str, object], settings: LLMSettings, error_type: type[Exception]) -> dict[str, object]:
    raw = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=raw,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.api_key}",
            "Content-Type": "application/json",
        },
    )
    attempts = settings.max_retries + 1
    last_status: int | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=settings.timeout_s) as response:
                parsed = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last_status = exc.code
            if exc.code == 429 or 500 <= exc.code <= 599:
                if attempt + 1 < attempts:
                    continue
            raise error_type(f"http {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise error_type("request failed") from exc
        if not isinstance(parsed, dict):
            raise error_type("response is not an object")
        return parsed
    raise error_type(f"http {last_status}")
