"""Configuration contract.

``load_settings`` is the only I/O entry point. It does not open network
connections, does not create directories, and does not log secret values.
Implementation is intentionally empty. See TODO.md, task 1.
"""

from __future__ import annotations

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
    pass
