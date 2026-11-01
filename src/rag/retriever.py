"""Query-time retrieval. Does not generate text and does not expand the graph."""

from __future__ import annotations

from src.knowledge.graph import KnowledgeGraph
from src.rag.embeddings import EmbeddingClient
from src.rag.models import RetrievedChunk
from src.rag.store import VectorStore


class Retriever:
    def __init__(
        self,
        store: VectorStore,
        embeddings: EmbeddingClient,
        graph: KnowledgeGraph,
        top_k: int,
    ) -> None:
        self._store = store
        self._embeddings = embeddings
        self._graph = graph
        self._top_k = top_k

    def search(self, query: str, top_k: int | None = None) -> list[RetrievedChunk]:
        """Embed ``query``, search the store, then stable-sort by score descending.

        Blank ``query`` raises ``ValueError``. ``top_k`` defaults to the value
        from construction. Hits with equal scores are ordered by
        ``(document_id, char_start, chunk_id)``. Graph expansion is not mixed
        into this list; callers use ``KnowledgeGraph.expand`` separately so
        vector rank stays reproducible.
        """
        if query.strip() == "":
            raise ValueError("query is blank")
        limit = self._top_k if top_k is None else top_k
        vectors = self._embeddings.embed([query])
        if not vectors:
            return []
        hits = self._store.search(vectors[0], limit)
        return sorted(
            hits,
            key=lambda hit: (
                -hit.score,
                hit.chunk.metadata.document_id,
                hit.chunk.metadata.char_start,
                hit.chunk.chunk_id,
            ),
        )
