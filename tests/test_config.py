"""Contract tests for ``config.load_settings``."""

from __future__ import annotations

from pathlib import Path

import pytest

from config import (
    InvalidSettingError,
    MissingSettingError,
    Settings,
    load_settings,
)


def _env(**overrides: str) -> dict[str, str]:
    base = {
        "LLM_BASE_URL": "https://llm.example/v1",
        "LLM_API_KEY": "sk-test",
        "LLM_MODEL": "gpt-4.1",
        "LLM_TIMEOUT_S": "60",
        "LLM_MAX_RETRIES": "2",
        "RAG_CHUNK_SIZE": "1200",
        "RAG_CHUNK_OVERLAP": "150",
        "RAG_TOP_K": "8",
        "RAG_EMBEDDING_MODEL": "text-embedding-3-small",
        "RAG_INDEX_DIR": "var/index",
        "SANDBOX_BACKEND": "subprocess",
        "SANDBOX_IMAGE": "python:3.11-slim",
        "SANDBOX_TIMEOUT_S": "5",
        "SANDBOX_MEMORY_MB": "256",
        "SANDBOX_CPU_LIMIT": "0.5",
        "SANDBOX_NETWORK_ENABLED": "false",
        "SANDBOX_MAX_OUTPUT_BYTES": "65536",
        "SANDBOX_WORKDIR": "var/sandbox",
        "EXPORT_OUTPUT_DIR": "var/export",
        "EXPORT_PDF_FONT": "Helvetica",
        "EXPORT_DOCX_FONT": "Calibri",
        "LOG_LEVEL": "INFO",
    }
    base.update(overrides)
    return base


def test_load_settings_maps_required_fields(tmp_path: Path) -> None:
    settings = load_settings(env=_env(), env_file=None)
    assert isinstance(settings, Settings)
    assert settings.llm.base_url == "https://llm.example/v1"
    assert settings.llm.api_key == "sk-test"
    assert settings.llm.model == "gpt-4.1"
    assert settings.llm.timeout_s == 60.0
    assert settings.llm.max_retries == 2
    assert settings.rag.chunk_size == 1200
    assert settings.rag.chunk_overlap == 150
    assert settings.rag.top_k == 8
    assert settings.rag.embedding_model == "text-embedding-3-small"
    assert settings.rag.index_dir == Path("var/index").resolve()
    assert settings.sandbox.backend == "subprocess"
    assert settings.sandbox.network_enabled is False
    assert settings.sandbox.memory_mb == 256
    assert settings.sandbox.cpu_limit == 0.5
    assert settings.export.output_dir == Path("var/export").resolve()
    assert settings.export.pdf_font == "Helvetica"
    assert settings.log_level == "INFO"
    assert not (tmp_path / "unused").exists()


def test_explicit_env_overrides_dotenv_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("LLM_MODEL=from-file\nLLM_API_KEY=file-key\n", encoding="utf-8")
    settings = load_settings(env=_env(LLM_MODEL="from-env"), env_file=env_file)
    assert isinstance(settings, Settings)
    assert settings.llm.model == "from-env"
    assert settings.llm.api_key == "sk-test"


def test_dotenv_export_prefix_quotes_and_comments(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "# comment",
                "export LLM_MODEL=\"from-dotenv\"",
                "export LLM_API_KEY='file-key'",
                "LOG_LEVEL=debug",
                "",
            ]
        ),
        encoding="utf-8",
    )
    env = _env()
    del env["LLM_MODEL"]
    del env["LLM_API_KEY"]
    del env["LOG_LEVEL"]
    settings = load_settings(env=env, env_file=env_file)
    assert isinstance(settings, Settings)
    assert settings.llm.model == "from-dotenv"
    assert settings.llm.api_key == "file-key"
    assert settings.log_level == "DEBUG"


def test_blank_api_key_is_missing() -> None:
    with pytest.raises(MissingSettingError) as exc_info:
        load_settings(env=_env(LLM_API_KEY="   "), env_file=None)
    assert exc_info.value.key == "LLM_API_KEY"


def test_absent_model_is_missing() -> None:
    env = _env()
    del env["LLM_MODEL"]
    with pytest.raises(MissingSettingError) as exc_info:
        load_settings(env=env, env_file=None)
    assert exc_info.value.key == "LLM_MODEL"


def test_overlap_not_smaller_than_chunk_size_is_invalid() -> None:
    with pytest.raises(InvalidSettingError) as exc_info:
        load_settings(env=_env(RAG_CHUNK_SIZE="100", RAG_CHUNK_OVERLAP="100"), env_file=None)
    assert exc_info.value.key == "RAG_CHUNK_OVERLAP"


def test_negative_timeout_is_invalid() -> None:
    with pytest.raises(InvalidSettingError) as exc_info:
        load_settings(env=_env(SANDBOX_TIMEOUT_S="0"), env_file=None)
    assert exc_info.value.key == "SANDBOX_TIMEOUT_S"


def test_unknown_backend_is_invalid() -> None:
    with pytest.raises(InvalidSettingError) as exc_info:
        load_settings(env=_env(SANDBOX_BACKEND="podman"), env_file=None)
    assert exc_info.value.key == "SANDBOX_BACKEND"


def test_non_integer_chunk_size_is_invalid() -> None:
    with pytest.raises(InvalidSettingError) as exc_info:
        load_settings(env=_env(RAG_CHUNK_SIZE="12.5"), env_file=None)
    assert exc_info.value.key == "RAG_CHUNK_SIZE"


def test_missing_env_file_is_config_error(tmp_path: Path) -> None:
    missing = tmp_path / "no-such.env"
    with pytest.raises(InvalidSettingError) as exc_info:
        load_settings(env=_env(), env_file=missing)
    assert exc_info.value.key == "env_file"


def test_network_flag_accepts_one_and_zero() -> None:
    enabled = load_settings(env=_env(SANDBOX_NETWORK_ENABLED="1"), env_file=None)
    disabled = load_settings(env=_env(SANDBOX_NETWORK_ENABLED="0"), env_file=None)
    assert isinstance(enabled, Settings)
    assert isinstance(disabled, Settings)
    assert enabled.sandbox.network_enabled is True
    assert disabled.sandbox.network_enabled is False


def test_empty_mapping_without_file_reports_first_missing_key() -> None:
    with pytest.raises(MissingSettingError) as exc_info:
        load_settings(env={}, env_file=None)
    assert exc_info.value.key == "LLM_BASE_URL"
