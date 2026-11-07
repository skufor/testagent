"""HTTP-layer smoke tests against FastAPI app (no live LLM)."""

from __future__ import annotations

import importlib

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDY_AGENT_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173,https://ai.skufor.ru")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://example.invalid/v1")
    monkeypatch.setenv("LLM_MODEL", "test-model")
    import server_core
    importlib.reload(server_core)
    with TestClient(server_core.app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200


def test_webauth_start(client):
    r = client.post("/webauth/start")
    assert r.status_code in {200, 503}


def test_webauth_status(client):
    r = client.get("/webauth/status", params={"nonce": "no-such-nonce"})
    assert r.status_code in {200, 404}


def test_reset_history(client):
    r = client.post("/reset_history", data={"chat_id": "test-chat"})
    assert r.status_code == 200
