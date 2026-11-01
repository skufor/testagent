"""Configuration contract.

``load_settings`` is the only I/O entry point. It does not open network
connections, does not create directories, and does not put secret values into
exception text.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Mapping


class ConfigError(Exception):
    """Base class for configuration failures."""


class MissingSettingError(ConfigError):
    """Required key is absent or blank in both the env mapping and the dotenv file."""

    def __init__(self, key: str) -> None:
        super().__init__(f"missing required setting: {key}")
        self.key = key


class InvalidSettingError(ConfigError):
    """Key is present but fails type, range, or enum validation."""

    def __init__(self, key: str, reason: str) -> None:
        super().__init__(f"invalid setting {key}: {reason}")
        self.key = key
        self.reason = reason


SandboxBackend = Literal["docker", "subprocess"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR"]

_LOG_LEVELS: frozenset[str] = frozenset({"DEBUG", "INFO", "WARNING", "ERROR"})
_BACKENDS: frozenset[str] = frozenset({"docker", "subprocess"})
_TRUE: frozenset[str] = frozenset({"1", "true"})
_FALSE: frozenset[str] = frozenset({"0", "false"})
_INT_RE = re.compile(r"[+-]?\d+")


@dataclass(frozen=True, slots=True)
class LLMSettings:
    base_url: str
    api_key: str
    model: str
    timeout_s: float
    max_retries: int


@dataclass(frozen=True, slots=True)
class RAGSettings:
    chunk_size: int
    chunk_overlap: int
    top_k: int
    embedding_model: str
    index_dir: Path


@dataclass(frozen=True, slots=True)
class SandboxSettings:
    backend: SandboxBackend
    image: str
    timeout_s: float
    memory_mb: int
    cpu_limit: float
    network_enabled: bool
    max_output_bytes: int
    workdir: Path


@dataclass(frozen=True, slots=True)
class ExportSettings:
    output_dir: Path
    pdf_font: str
    docx_font: str


@dataclass(frozen=True, slots=True)
class Settings:
    llm: LLMSettings
    rag: RAGSettings
    sandbox: SandboxSettings
    export: ExportSettings
    log_level: LogLevel


def load_settings(
    env: Mapping[str, str] | None = None,
    env_file: Path | None = None,
) -> Settings:
    """Build ``Settings`` from an env mapping and an optional dotenv file.

    Precedence: keys in ``env`` override keys parsed from ``env_file``.
    ``env is None`` reads ``os.environ``. ``env == {}`` ignores the process
    environment and uses only ``env_file``. Blank required strings are missing.
    Unknown keys are ignored. Directories are not created.
    """
    merged = _merge(env, env_file)
    base_url = _require_str(merged, "LLM_BASE_URL")
    api_key = _require_str(merged, "LLM_API_KEY")
    model = _require_str(merged, "LLM_MODEL")
    timeout_s = _require_float(merged, "LLM_TIMEOUT_S", minimum_exclusive=0.0)
    max_retries = _require_int(merged, "LLM_MAX_RETRIES", minimum=0)
    chunk_size = _require_int(merged, "RAG_CHUNK_SIZE", minimum=1)
    chunk_overlap = _require_int(merged, "RAG_CHUNK_OVERLAP", minimum=0)
    if chunk_overlap >= chunk_size:
        raise InvalidSettingError("RAG_CHUNK_OVERLAP", "must be < RAG_CHUNK_SIZE")
    top_k = _require_int(merged, "RAG_TOP_K", minimum=1)
    embedding_model = _require_str(merged, "RAG_EMBEDDING_MODEL")
    index_dir = _require_path(merged, "RAG_INDEX_DIR")
    backend = _require_backend(merged)
    image = _require_str(merged, "SANDBOX_IMAGE")
    sandbox_timeout = _require_float(merged, "SANDBOX_TIMEOUT_S", minimum_exclusive=0.0)
    memory_mb = _require_int(merged, "SANDBOX_MEMORY_MB", minimum=1)
    cpu_limit = _require_float(merged, "SANDBOX_CPU_LIMIT", minimum_exclusive=0.0)
    network_enabled = _require_bool(merged, "SANDBOX_NETWORK_ENABLED")
    max_output_bytes = _require_int(merged, "SANDBOX_MAX_OUTPUT_BYTES", minimum=1)
    workdir = _require_path(merged, "SANDBOX_WORKDIR")
    output_dir = _require_path(merged, "EXPORT_OUTPUT_DIR")
    pdf_font = _require_str(merged, "EXPORT_PDF_FONT")
    docx_font = _require_str(merged, "EXPORT_DOCX_FONT")
    log_level = _log_level(merged)
    return Settings(
        llm=LLMSettings(
            base_url=base_url,
            api_key=api_key,
            model=model,
            timeout_s=timeout_s,
            max_retries=max_retries,
        ),
        rag=RAGSettings(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            top_k=top_k,
            embedding_model=embedding_model,
            index_dir=index_dir,
        ),
        sandbox=SandboxSettings(
            backend=backend,
            image=image,
            timeout_s=sandbox_timeout,
            memory_mb=memory_mb,
            cpu_limit=cpu_limit,
            network_enabled=network_enabled,
            max_output_bytes=max_output_bytes,
            workdir=workdir,
        ),
        export=ExportSettings(
            output_dir=output_dir,
            pdf_font=pdf_font,
            docx_font=docx_font,
        ),
        log_level=log_level,
    )


def _merge(env: Mapping[str, str] | None, env_file: Path | None) -> dict[str, str]:
    merged: dict[str, str] = {}
    if env_file is not None:
        if not env_file.is_file():
            raise InvalidSettingError("env_file", "path is not a file")
        try:
            text = env_file.read_text(encoding="utf-8")
        except OSError as exc:
            raise InvalidSettingError("env_file", "unreadable") from exc
        merged.update(_parse_dotenv(text))
    source: Mapping[str, str] = os.environ if env is None else env
    for key, value in source.items():
        merged[key] = value
    return merged


def _parse_dotenv(text: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            continue
        parsed[key] = _unquote_value(value.strip())
    return parsed


def _unquote_value(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    comment = re.search(r"\s#", value)
    if comment is not None:
        value = value[: comment.start()]
    return value.strip()


def _require_str(data: Mapping[str, str], key: str) -> str:
    if key not in data:
        raise MissingSettingError(key)
    value = data[key].strip()
    if value == "":
        raise MissingSettingError(key)
    return value


def _require_int(data: Mapping[str, str], key: str, *, minimum: int) -> int:
    if key not in data or data[key].strip() == "":
        raise MissingSettingError(key)
    raw = data[key].strip()
    if _INT_RE.fullmatch(raw) is None:
        raise InvalidSettingError(key, "expected integer")
    value = int(raw)
    if value < minimum:
        raise InvalidSettingError(key, f"must be >= {minimum}")
    return value


def _require_float(data: Mapping[str, str], key: str, *, minimum_exclusive: float) -> float:
    if key not in data or data[key].strip() == "":
        raise MissingSettingError(key)
    raw = data[key].strip()
    try:
        value = float(raw)
    except ValueError as exc:
        raise InvalidSettingError(key, "expected number") from exc
    if not value > minimum_exclusive:
        raise InvalidSettingError(key, f"must be > {minimum_exclusive}")
    return value


def _require_bool(data: Mapping[str, str], key: str) -> bool:
    if key not in data or data[key].strip() == "":
        raise MissingSettingError(key)
    raw = data[key].strip().lower()
    if raw in _TRUE:
        return True
    if raw in _FALSE:
        return False
    raise InvalidSettingError(key, "expected 1|0|true|false")


def _require_path(data: Mapping[str, str], key: str) -> Path:
    raw = _require_str(data, key)
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    return path.resolve()


def _require_backend(data: Mapping[str, str]) -> SandboxBackend:
    raw = _require_str(data, "SANDBOX_BACKEND")
    if raw not in _BACKENDS:
        raise InvalidSettingError("SANDBOX_BACKEND", "expected docker or subprocess")
    return raw  # type: ignore[return-value]


def _log_level(data: Mapping[str, str]) -> LogLevel:
    if "LOG_LEVEL" not in data or data["LOG_LEVEL"].strip() == "":
        return "INFO"
    raw = data["LOG_LEVEL"].strip().upper()
    if raw not in _LOG_LEVELS:
        raise InvalidSettingError("LOG_LEVEL", "expected DEBUG|INFO|WARNING|ERROR")
    return raw  # type: ignore[return-value]
