"""Concept and relation records stored in the knowledge graph."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from src.rag.models import SourceSpan

ConceptKind = Literal["term", "topic", "definition", "formula"]
Predicate = Literal["defines", "prerequisite_of", "part_of", "related_to", "example_of"]


@dataclass(frozen=True, slots=True)
class Concept:
    concept_id: str
    label: str
    kind: ConceptKind
    document_id: str
    source_refs: tuple[SourceSpan, ...]


@dataclass(frozen=True, slots=True)
class Relation:
    source_id: str
    target_id: str
    predicate: Predicate


@dataclass(frozen=True, slots=True)
class GraphSnapshot:
    """Serializable view. ``networkx.DiGraph`` is built from this in the implementation."""

    nodes: tuple[Concept, ...]
    edges: tuple[Relation, ...]
