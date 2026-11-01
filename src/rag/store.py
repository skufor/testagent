"""Vector index. Persistence format is an implementation detail of task 3.

The store does not compute embeddings. Callers pass vectors already produced
by ``EmbeddingClient``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from src.rag.models import Chunk, RetrievedChunk


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

    def upsert(self, chunks: list[Chunk]) -> int:
        pass

    def search(self, vector: tuple[float, ...], top_k: int) -> list[RetrievedChunk]:
        pass
