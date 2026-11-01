"""OpenAI-compatible chat client.

Transport is HTTPS to ``LLMSettings.base_url``. No provider-specific SDK
calls belong outside this module. Body is a stub. See TODO.md (used by tasks 3 and 4).
"""

from __future__ import annotations

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
        pass
