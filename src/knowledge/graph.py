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
    def __init__(self) -> None:
        self._nodes: dict[str, Concept] = {}
        self._edges: dict[tuple[str, str, str], Relation] = {}

    def add_concept(self, concept: Concept) -> None:
        """Insert ``concept``. Same id and equal payload is a no-op. Same id, different payload raises."""
        current = self._nodes.get(concept.concept_id)
        if current is None:
            self._nodes[concept.concept_id] = concept
            return
        if current != concept:
            raise GraphError(f"concept already exists: {concept.concept_id}")

    def add_relation(self, relation: Relation) -> None:
        """Insert ``relation``. Both endpoints must already exist. Duplicate edge is a no-op."""
        if relation.source_id not in self._nodes or relation.target_id not in self._nodes:
            raise GraphError("relation endpoint is missing")
        key = (relation.source_id, relation.predicate, relation.target_id)
        self._edges.setdefault(key, relation)

    def remove_document(self, document_id: str) -> int:
        """Drop concepts whose ``document_id`` matches, and edges touching them. Return nodes removed."""
        removed = [concept_id for concept_id, concept in self._nodes.items() if concept.document_id == document_id]
        drop = set(removed)
        for concept_id in removed:
            del self._nodes[concept_id]
        stale = [key for key in self._edges if key[0] in drop or key[2] in drop]
        for key in stale:
            del self._edges[key]
        return len(removed)

    def get(self, concept_id: str) -> Concept | None:
        """Return the concept or ``None``. Does not raise on a miss."""
        return self._nodes.get(concept_id)

    def expand(self, concept_ids: list[str], depth: int) -> list[Concept]:
        """Directed neighborhood up to ``depth`` hops.

        ``depth == 0`` returns the existing seeds only. Unknown ids are skipped.
        Order is stable: breadth-first, then ``concept_id`` ascending within a layer.
        ``depth < 0`` raises ``GraphError``.
        """
        if depth < 0:
            raise GraphError("depth must be >= 0")
        seeds = sorted({concept_id for concept_id in concept_ids if concept_id in self._nodes})
        if depth == 0:
            return [self._nodes[concept_id] for concept_id in seeds]
        seen = set(seeds)
        layer = seeds
        ordered = list(seeds)
        adjacency = _adjacency(self._edges)
        for _ in range(depth):
            nxt: set[str] = set()
            for concept_id in layer:
                for target in adjacency.get(concept_id, ()):
                    if target not in seen and target in self._nodes:
                        nxt.add(target)
            layer = sorted(nxt)
            for concept_id in layer:
                seen.add(concept_id)
            ordered.extend(layer)
        return [self._nodes[concept_id] for concept_id in ordered]

    def snapshot(self) -> GraphSnapshot:
        """Return nodes and edges sorted by id so two snapshots compare equal."""
        import networkx as nx

        nodes = tuple(sorted(self._nodes.values(), key=lambda concept: concept.concept_id))
        edges = tuple(sorted(self._edges.values(), key=lambda relation: (relation.source_id, relation.predicate, relation.target_id)))
        graph = nx.DiGraph()
        for concept in nodes:
            graph.add_node(concept.concept_id, kind=concept.kind)
        for relation in edges:
            graph.add_edge(relation.source_id, relation.target_id, predicate=relation.predicate)
        if graph.number_of_nodes() != len(nodes) or graph.number_of_edges() != len(edges):
            raise GraphError("snapshot graph does not match the records")
        return GraphSnapshot(nodes=nodes, edges=edges)

    def restore(self, snapshot: GraphSnapshot) -> None:
        """Replace the current graph. Atomic: a validation failure leaves the previous graph."""
        nodes: dict[str, Concept] = {}
        for concept in snapshot.nodes:
            current = nodes.get(concept.concept_id)
            if current is not None and current != concept:
                raise GraphError(f"duplicate concept in snapshot: {concept.concept_id}")
            nodes[concept.concept_id] = concept
        edges: dict[tuple[str, str, str], Relation] = {}
        for relation in snapshot.edges:
            if relation.source_id not in nodes or relation.target_id not in nodes:
                raise GraphError("snapshot relation endpoint is missing")
            key = (relation.source_id, relation.predicate, relation.target_id)
            edges[key] = relation
        self._nodes = nodes
        self._edges = edges


def _adjacency(edges: dict[tuple[str, str, str], Relation]) -> dict[str, list[str]]:
    adjacency: dict[str, list[str]] = {}
    for source_id, _predicate, target_id in edges:
        adjacency.setdefault(source_id, []).append(target_id)
    return adjacency
