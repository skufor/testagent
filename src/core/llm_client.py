"""OpenAI-compatible chat client.

Transport is HTTPS to ``LLMSettings.base_url``. No provider-specific SDK
calls belong outside this module.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Literal, Protocol, Sequence

from config import LLMSettings


Role = Literal["system", "user", "assistant"]
ResponseFormat = Literal["text", "json"]


@dataclass(frozen=True, slots=True)
class ChatMessage:
    role: Role
    content: str


@dataclass(frozen=True, slots=True)
class CompletionRequest:
    messages: Sequence[ChatMessage]
    temperature: float = 0.0
    max_tokens: int | None = None
    response_format: ResponseFormat = "text"
    model: str | None = None


@dataclass(frozen=True, slots=True)
class CompletionResult:
    text: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    finish_reason: str


class LLMClient(Protocol):
    """Synchronous chat completion. Streaming is out of scope."""

    def complete(self, request: CompletionRequest) -> CompletionResult:
        """Return one completion. Raise ``LLMError`` on transport or protocol failure."""


class LLMError(Exception):
    """Chat endpoint failed or returned a payload that violates the contract."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class OpenAICompatibleClient:
    """POST ``{base_url}/chat/completions`` with a bearer ``api_key``."""

    def __init__(self, settings: LLMSettings) -> None:
        self._settings = settings

    def complete(self, request: CompletionRequest) -> CompletionResult:
        """Execute ``request``. Retries only on HTTP 429 and 5xx, up to ``max_retries``."""
        url = self._settings.base_url.rstrip("/") + "/chat/completions"
        payload: dict[str, object] = {
            "model": request.model or self._settings.model,
            "messages": [{"role": message.role, "content": message.content} for message in request.messages],
            "temperature": request.temperature,
        }
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens
        if request.response_format == "json":
            payload["response_format"] = {"type": "json_object"}
        body = _post_json(url, payload, self._settings)
        choices = body.get("choices")
        if not isinstance(choices, list) or not choices:
            raise LLMError("chat response has no choices")
        first = choices[0]
        if not isinstance(first, dict):
            raise LLMError("chat choice is invalid")
        message = first.get("message")
        if not isinstance(message, dict) or not isinstance(message.get("content"), str):
            raise LLMError("chat message is invalid")
        usage = body.get("usage") if isinstance(body.get("usage"), dict) else {}
        prompt_tokens = usage.get("prompt_tokens", 0) if isinstance(usage, dict) else 0
        completion_tokens = usage.get("completion_tokens", 0) if isinstance(usage, dict) else 0
        finish = first.get("finish_reason", "")
        return CompletionResult(
            text=message["content"],
            model=str(body.get("model", self._settings.model)),
            prompt_tokens=int(prompt_tokens) if isinstance(prompt_tokens, int) else 0,
            completion_tokens=int(completion_tokens) if isinstance(completion_tokens, int) else 0,
            finish_reason=finish if isinstance(finish, str) else "",
        )


def _post_json(url: str, payload: dict[str, object], settings: LLMSettings) -> dict[str, object]:
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
            if (exc.code == 429 or 500 <= exc.code <= 599) and attempt + 1 < attempts:
                continue
            raise LLMError(f"http {exc.code}", status_code=exc.code) from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise LLMError("request failed") from exc
        if not isinstance(parsed, dict):
            raise LLMError("response is not an object")
        return parsed
    raise LLMError(f"http {last_status}", status_code=last_status)
