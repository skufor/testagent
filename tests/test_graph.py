"""Knowledge graph contract tests."""

from __future__ import annotations

import pytest

from src.knowledge.graph import GraphError, KnowledgeGraph
from src.knowledge.models import Concept, GraphSnapshot, Relation
from src.rag.models import SourceSpan


def _concept(concept_id: str, label: str = "label", document_id: str = "doc") -> Concept:
    return Concept(
        concept_id=concept_id,
        label=label,
        kind="term",
        document_id=document_id,
        source_refs=(SourceSpan(document_id, "a.txt", None, None, 0, 1),),
    )


def test_expand_empty_and_unknown_and_negative_depth() -> None:
    graph = KnowledgeGraph()
    graph.add_concept(_concept("b"))
    graph.add_concept(_concept("a"))
    assert graph.expand([], 1) == []
    assert [item.concept_id for item in graph.expand(["missing", "b"], 0)] == ["b"]
    with pytest.raises(GraphError):
        graph.expand(["a"], -1)


def test_duplicate_concept_with_different_label_raises() -> None:
    graph = KnowledgeGraph()
    graph.add_concept(_concept("a", "one"))
    graph.add_concept(_concept("a", "one"))
    with pytest.raises(GraphError):
        graph.add_concept(_concept("a", "two"))


def test_expand_is_directed_bfs() -> None:
    graph = KnowledgeGraph()
    for concept_id in ("a", "c", "b"):
        graph.add_concept(_concept(concept_id))
    graph.add_relation(Relation("a", "c", "related_to"))
    graph.add_relation(Relation("a", "b", "part_of"))
    assert [item.concept_id for item in graph.expand(["a"], 1)] == ["a", "b", "c"]


def test_snapshot_is_sorted_and_restore_is_atomic() -> None:
    graph = KnowledgeGraph()
    graph.add_concept(_concept("b"))
    graph.add_concept(_concept("a"))
    snapshot = graph.snapshot()
    assert [node.concept_id for node in snapshot.nodes] == ["a", "b"]
    broken = GraphSnapshot(
        nodes=snapshot.nodes,
        edges=(Relation("a", "missing", "defines"),),
    )
    with pytest.raises(GraphError):
        graph.restore(broken)
    assert graph.get("b") is not None
    assert graph.get("a") is not None
