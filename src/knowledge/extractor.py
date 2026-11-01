"""Concept extraction over already-chunked text.

The extractor calls ``LLMClient`` with ``response_format='json'`` and writes
into ``KnowledgeGraph``. It does not embed and does not read files.
"""

from __future__ import annotations

import json

from src.core.llm_client import ChatMessage, CompletionRequest, LLMClient, LLMError
from src.knowledge.graph import GraphError, KnowledgeGraph
from src.knowledge.models import Concept, Relation
from src.rag.models import Chunk, SourceSpan
from src.utils.ids import stable_id

_KINDS: frozenset[str] = frozenset({"term", "topic", "definition", "formula"})
_PREDICATES: frozenset[str] = frozenset({"defines", "prerequisite_of", "part_of", "related_to", "example_of"})


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
        if not chunks:
            return []
        document_ids = {chunk.metadata.document_id for chunk in chunks}
        if len(document_ids) != 1:
            raise ExtractionError("chunks must belong to one document")
        document_id = next(iter(document_ids))
        request = CompletionRequest(
            messages=[
                ChatMessage(
                    role="system",
                    content=(
                        "Return one JSON object {\"concepts\": [...], \"relations\": [...]}. "
                        "concept fields: concept_id, label, kind (term|topic|definition|formula), "
                        "source_refs [{char_start, char_end, document_id}]. "
                        "relation fields: source_id, target_id, predicate "
                        "(defines|prerequisite_of|part_of|related_to|example_of). "
                        "source_refs must overlap a provided chunk."
                    ),
                ),
                ChatMessage(role="user", content=_chunk_prompt(chunks)),
            ],
            temperature=0.0,
            response_format="json",
        )
        try:
            result = self._llm.complete(request)
        except LLMError as exc:
            raise ExtractionError("model request failed") from exc
        concepts, relations = _parse_payload(result.text, chunks, document_id)
        snapshot = self._graph.snapshot()
        try:
            for concept in concepts:
                self._graph.add_concept(concept)
            for relation in relations:
                self._graph.add_relation(relation)
        except (GraphError, ExtractionError) as exc:
            self._graph.restore(snapshot)
            if isinstance(exc, ExtractionError):
                raise
            raise ExtractionError("graph rejected the extraction") from exc
        return concepts


def _chunk_prompt(chunks: list[Chunk]) -> str:
    lines = []
    for chunk in chunks:
        meta = chunk.metadata
        lines.append(
            f"chunk {meta.document_id}@{meta.char_start}:{meta.char_end} {chunk.text}"
        )
    return "\n".join(lines)


def _parse_payload(text: str, chunks: list[Chunk], document_id: str) -> tuple[list[Concept], list[Relation]]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ExtractionError("model output is not json") from exc
    if not isinstance(payload, dict):
        raise ExtractionError("model output is not an object")
    raw_concepts = payload.get("concepts", [])
    raw_relations = payload.get("relations", [])
    if not isinstance(raw_concepts, list) or not isinstance(raw_relations, list):
        raise ExtractionError("concepts and relations must be lists")
    concepts: list[Concept] = []
    for item in raw_concepts:
        concepts.append(_concept(item, chunks, document_id))
    known = {concept.concept_id for concept in concepts}
    relations: list[Relation] = []
    for item in raw_relations:
        relations.append(_relation(item, known))
    return concepts, relations


def _concept(item: object, chunks: list[Chunk], document_id: str) -> Concept:
    if not isinstance(item, dict):
        raise ExtractionError("concept is not an object")
    label = item.get("label")
    kind = item.get("kind")
    if not isinstance(label, str) or label.strip() == "":
        raise ExtractionError("concept label is empty")
    if kind not in _KINDS:
        raise ExtractionError("concept kind is invalid")
    concept_id = item.get("concept_id")
    if not isinstance(concept_id, str) or concept_id.strip() == "":
        concept_id = stable_id(document_id, label, str(kind))
    refs = item.get("source_refs", [])
    if not isinstance(refs, list) or not refs:
        raise ExtractionError("concept has no source_refs")
    spans: list[SourceSpan] = []
    for ref in refs:
        spans.append(_span(ref, chunks, document_id))
    return Concept(
        concept_id=concept_id,
        label=label,
        kind=kind,  # type: ignore[arg-type]
        document_id=document_id,
        source_refs=tuple(spans),
    )


def _span(ref: object, chunks: list[Chunk], document_id: str) -> SourceSpan:
    if not isinstance(ref, dict):
        raise ExtractionError("source_ref is not an object")
    try:
        start = int(ref["char_start"])
        end = int(ref["char_end"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ExtractionError("source_ref range is invalid") from exc
    ref_document = ref.get("document_id", document_id)
    if ref_document != document_id:
        raise ExtractionError("source_ref document does not match the chunks")
    for chunk in chunks:
        meta = chunk.metadata
        if meta.document_id != document_id:
            continue
        if start < meta.char_end and end > meta.char_start:
            return SourceSpan(
                document_id=document_id,
                source_path=meta.source_path,
                page=meta.page,
                section=meta.section,
                char_start=start,
                char_end=end,
            )
    raise ExtractionError("source_ref does not overlap a chunk")


def _relation(item: object, known: set[str]) -> Relation:
    if not isinstance(item, dict):
        raise ExtractionError("relation is not an object")
    source_id = item.get("source_id")
    target_id = item.get("target_id")
    predicate = item.get("predicate")
    if not isinstance(source_id, str) or not isinstance(target_id, str):
        raise ExtractionError("relation endpoints are invalid")
    if predicate not in _PREDICATES:
        raise ExtractionError("relation predicate is invalid")
    if source_id not in known or target_id not in known:
        raise ExtractionError("relation endpoint was not extracted")
    return Relation(source_id=source_id, target_id=target_id, predicate=predicate)  # type: ignore[arg-type]
