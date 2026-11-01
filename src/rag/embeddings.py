"""Embedding client over the same OpenAI-compatible endpoint as chat."""

from __future__ import annotations

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
        pass
