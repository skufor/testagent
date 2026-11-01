"""Ingestion pipeline: parse, chunk, embed, upsert, extract concepts."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from src.knowledge.extractor import ConceptExtractor
from src.knowledge.graph import KnowledgeGraph
from src.rag.chunker import Chunker
from src.rag.embeddings import EmbeddingClient, EmbeddingError
from src.rag.models import Chunk, IngestReport
from src.rag.parsers import parser_for
from src.rag.store import VectorStore
from src.utils.ids import stable_id


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
        resolved = path.resolve()
        doc_id = document_id if document_id is not None else stable_id(str(resolved))
        parsed = parser_for(path).parse(path, doc_id)
        chunks = self._chunker.split(parsed)
        embedded = self._embed(chunks)
        snapshot = self._graph.snapshot()
        try:
            self._graph.remove_document(doc_id)
            concepts = self._extractor.extract(embedded)
            replace_document = getattr(self._store, "replace_document", None)
            if replace_document is not None:
                replace_document(doc_id, embedded)
            else:
                self._store.upsert(embedded)
        except Exception:
            self._graph.restore(snapshot)
            raise
        return IngestReport(document_id=doc_id, chunk_count=len(embedded), concept_count=len(concepts))

    def _embed(self, chunks: list[Chunk]) -> list[Chunk]:
        if not chunks:
            return []
        try:
            vectors = self._embeddings.embed([chunk.text for chunk in chunks])
        except EmbeddingError:
            raise
        if len(vectors) != len(chunks):
            raise EmbeddingError("embedding count does not match chunks")
        return [replace(chunk, embedding=vector) for chunk, vector in zip(chunks, vectors)]
