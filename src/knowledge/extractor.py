"""Concept extraction over already-chunked text.

The extractor calls ``LLMClient`` with ``response_format='json'`` and writes
into ``KnowledgeGraph``. It does not embed and does not read files.
"""

from __future__ import annotations

from src.core.llm_client import LLMClient
from src.knowledge.graph import KnowledgeGraph
from src.knowledge.models import Concept
from src.rag.models import Chunk


class ExtractionError(Exception):
    """Model output is not the documented JSON object, or a span does not match a chunk."""


class ConceptExtractor:
    def __init__(self, llm: LLMClient, graph: KnowledgeGraph) -> None:
        self._llm = llm
        self._graph = graph

    def extract(self, chunks: list[Chunk]) -> list[Concept]:
        """Extract concepts and relations for ``chunks`` of a single document.

        Every returned concept's ``source_refs`` must point at one of ``chunks``.
        An empty ``chunks`` returns ``[]`` and does not call the model.
        On ``ExtractionError`` the graph is unchanged.
        """
        pass
