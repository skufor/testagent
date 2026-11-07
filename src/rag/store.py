"""Vector index. Persistence format is an implementation detail of task 3.

The store does not compute embeddings. Callers pass vectors already produced
by ``EmbeddingClient``.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Protocol

from src.rag.models import Chunk, RetrievedChunk, SourceSpan


class IndexError_(Exception):
    """Index directory is unreadable or a record fails validation.

    Named ``IndexError_`` so it does not shadow the builtin.
    """


class VectorStore(Protocol):
    def upsert(self, chunks: list[Chunk]) -> int:
        """Insert or replace by ``chunk_id``. Return the number of records written.

        Every chunk must have a non-empty ``embedding``. Otherwise raise ``IndexError_``.
        """

    def search(self, vector: tuple[float, ...], top_k: int) -> list[RetrievedChunk]:
        """Cosine similarity, descending score. ``top_k < 1`` raises ``IndexError_``."""


class FileVectorStore:
    """On-disk index rooted at ``index_dir``. One document must not be half-written."""

    def __init__(self, index_dir: Path) -> None:
        self._index_dir = index_dir
        self._path = index_dir / "index.json"

    def upsert(self, chunks: list[Chunk]) -> int:
        vectors = [_require_vector(chunk) for chunk in chunks]
        _same_dimension(vectors)
        current = self._load()
        records: dict[str, dict[str, object]] = dict(current["records"])
        if vectors and current["dim"] not in (0, len(vectors[0])):
            raise IndexError_("embedding dimension does not match the index")
        for chunk, vector in zip(chunks, vectors):
            records[chunk.chunk_id] = _record(chunk, vector)
        dim = len(vectors[0]) if vectors else int(current["dim"])
        self._write({"dim": dim, "records": records})
        return len(chunks)

    def replace_document(self, document_id: str, chunks: list[Chunk]) -> int:
        """Drop every record of ``document_id`` and insert ``chunks`` in one write."""
        vectors = [_require_vector(chunk) for chunk in chunks]
        _same_dimension(vectors)
        current = self._load()
        records = {
            key: value
            for key, value in current["records"].items()
            if not _same_document(value, document_id)
        }
        remaining_dim = _dimension_of(records)
        if vectors and remaining_dim not in (0, len(vectors[0])):
            raise IndexError_("embedding dimension does not match the index")
        for chunk, vector in zip(chunks, vectors):
            records[chunk.chunk_id] = _record(chunk, vector)
        dim = len(vectors[0]) if vectors else remaining_dim
        self._write({"dim": dim, "records": records})
        return len(chunks)

    def search(self, vector: tuple[float, ...], top_k: int) -> list[RetrievedChunk]:
        if top_k < 1:
            raise IndexError_("top_k must be >= 1")
        if not vector or all(component == 0.0 for component in vector):
            return []
        current = self._load()
        records = current.get("records")
        if not isinstance(records, dict):
            return []
        scored: list[RetrievedChunk] = []
        for payload in records.values():
            if not isinstance(payload, dict):
                continue
            raw_emb = payload.get("embedding")
            raw_chunk = payload.get("chunk")
            if not isinstance(raw_emb, (list, tuple)) or not isinstance(raw_chunk, dict):
                continue
            try:
                embedding = tuple(float(item) for item in raw_emb)
            except (TypeError, ValueError):
                continue
            if len(embedding) != len(vector):
                continue
            try:
                score = _cosine(vector, embedding)
                chunk = _chunk_from_payload(raw_chunk)
            except (IndexError_, TypeError, ValueError, KeyError):
                continue
            scored.append(RetrievedChunk(chunk=chunk, score=score))
        scored.sort(
            key=lambda item: (
                -item.score,
                item.chunk.metadata.document_id,
                item.chunk.metadata.char_start,
                item.chunk.chunk_id,
            )
        )
        return scored[:top_k]

    def documents(self) -> list[tuple[str, str]]:
        """Unique ``(document_id, source_path)`` pairs, sorted by document id."""
        current = self._load()
        found: dict[str, str] = {}
        records = current["records"]
        if not isinstance(records, dict):
            return []
        for payload in records.values():
            if not isinstance(payload, dict):
                continue
            chunk = payload.get("chunk")
            if not isinstance(chunk, dict):
                continue
            metadata = chunk.get("metadata")
            if not isinstance(metadata, dict) or "document_id" not in metadata:
                continue
            found[str(metadata["document_id"])] = str(metadata.get("source_path") or "")
        return sorted(found.items())

    def _load(self) -> dict[str, object]:
        if not self._path.exists():
            return {"dim": 0, "records": {}}
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise IndexError_("index is unreadable") from exc
        if not isinstance(raw, dict) or not isinstance(raw.get("records"), dict):
            raise IndexError_("index is unreadable")
        dim = raw.get("dim", 0)
        if not isinstance(dim, int):
            raise IndexError_("index is unreadable")
        return {"dim": dim, "records": raw["records"]}

    def _write(self, payload: dict[str, object]) -> None:
        self._index_dir.mkdir(parents=True, exist_ok=True)
        temporary = self._path.with_name(f".{self._path.name}.{os.getpid()}.tmp")
        try:
            temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            os.replace(temporary, self._path)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise


def _same_dimension(vectors: list[tuple[float, ...]]) -> None:
    if vectors and any(len(vector) != len(vectors[0]) for vector in vectors):
        raise IndexError_("mixed embedding dimensions")


def _record(chunk: Chunk, vector: tuple[float, ...]) -> dict[str, object]:
    return {"chunk": _chunk_payload(chunk), "embedding": list(vector)}


def _same_document(payload: object, document_id: str) -> bool:
    if not isinstance(payload, dict):
        return False
    chunk = payload.get("chunk")
    if not isinstance(chunk, dict):
        return False
    metadata = chunk.get("metadata")
    return isinstance(metadata, dict) and metadata.get("document_id") == document_id


def _dimension_of(records: dict[str, dict[str, object]]) -> int:
    for payload in records.values():
        embedding = payload.get("embedding")
        if isinstance(embedding, list) and embedding:
            return len(embedding)
    return 0


def _require_vector(chunk: Chunk) -> tuple[float, ...]:
    if not chunk.embedding:
        raise IndexError_("chunk is missing an embedding")
    return tuple(float(item) for item in chunk.embedding)


def _cosine(left: tuple[float, ...], right: tuple[float, ...]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    dot = 0.0
    left_norm = 0.0
    right_norm = 0.0
    for left_item, right_item in zip(left, right):
        dot += left_item * right_item
        left_norm += left_item * left_item
        right_norm += right_item * right_item
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return dot / (math.sqrt(left_norm) * math.sqrt(right_norm))


def _chunk_payload(chunk: Chunk) -> dict[str, object]:
    metadata = chunk.metadata
    return {
        "chunk_id": chunk.chunk_id,
        "text": chunk.text,
        "metadata": {
            "document_id": metadata.document_id,
            "source_path": metadata.source_path,
            "page": metadata.page,
            "section": metadata.section,
            "char_start": metadata.char_start,
            "char_end": metadata.char_end,
        },
    }


def _chunk_from_payload(payload: object) -> Chunk:
    if not isinstance(payload, dict):
        raise IndexError_("index record is invalid")
    metadata = payload.get("metadata")
    if not isinstance(metadata, dict):
        raise IndexError_("index record is invalid")
    page = metadata.get("page")
    section = metadata.get("section")
    return Chunk(
        chunk_id=str(payload["chunk_id"]),
        text=str(payload["text"]),
        metadata=SourceSpan(
            document_id=str(metadata["document_id"]),
            source_path=str(metadata["source_path"]),
            page=page if isinstance(page, int) else None,
            section=section if isinstance(section, str) else None,
            char_start=int(metadata["char_start"]),
            char_end=int(metadata["char_end"]),
        ),
        embedding=None,
    )
