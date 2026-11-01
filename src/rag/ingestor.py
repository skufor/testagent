"""Ingestion pipeline: parse, chunk, embed, upsert, extract concepts."""

from __future__ import annotations

from pathlib import Path

from src.knowledge.extractor import ConceptExtractor
from src.knowledge.graph import KnowledgeGraph
from src.rag.chunker import Chunker
from src.rag.embeddings import EmbeddingClient
from src.rag.models import IngestReport
from src.rag.store import VectorStore


class DocumentIngestor:
    def __init__(
        self,
        chunker: Chunker,
        embeddings: EmbeddingClient,
        store: VectorStore,
        extractor: ConceptExtractor,
        graph: KnowledgeGraph,
    ) -> None:
        self._chunker = chunker
        self._embeddings = embeddings
        self._store = store
        self._extractor = extractor
        self._graph = graph

    def ingest_path(self, path: Path, document_id: str | None = None) -> IngestReport:
        """Ingest one file.

        ``document_id`` defaults to ``stable_id(str(resolved_path))``.
        Re-ingesting the same id replaces chunks and concept nodes for that id.
        A parser or embedding failure leaves the previous index generation intact.
        """
        pass
