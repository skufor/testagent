"""In-memory directed knowledge graph.

Node identity is ``concept_id``. Edges are unique on
``(source_id, predicate, target_id)``. Persistence is not this type's job;
``snapshot`` / ``restore`` are the boundary.
"""

from __future__ import annotations

from src.knowledge.models import Concept, GraphSnapshot, Relation


class GraphError(Exception):
    """Graph operation references a missing node or a duplicate identity with a different payload."""


class KnowledgeGraph:
    def add_concept(self, concept: Concept) -> None:
        """Insert ``concept``. Same id and equal payload is a no-op. Same id, different payload raises."""
        pass

    def add_relation(self, relation: Relation) -> None:
        """Insert ``relation``. Both endpoints must already exist. Duplicate edge is a no-op."""
        pass

    def remove_document(self, document_id: str) -> int:
        """Drop concepts whose ``document_id`` matches, and edges touching them. Return nodes removed."""
        pass

    def get(self, concept_id: str) -> Concept | None:
        """Return the concept or ``None``. Does not raise on a miss."""
        pass

    def expand(self, concept_ids: list[str], depth: int) -> list[Concept]:
        """Directed neighborhood up to ``depth`` hops.

        ``depth == 0`` returns the existing seeds only. Unknown ids are skipped.
        Order is stable: breadth-first, then ``concept_id`` ascending within a layer.
        ``depth < 0`` raises ``GraphError``.
        """
        pass

    def snapshot(self) -> GraphSnapshot:
        """Return nodes and edges sorted by id so two snapshots compare equal."""
        pass

    def restore(self, snapshot: GraphSnapshot) -> None:
        """Replace the current graph. Atomic: a validation failure leaves the previous graph."""
        pass
