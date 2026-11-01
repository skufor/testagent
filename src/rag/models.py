"""RAG value objects. Metadata is mandatory on every chunk."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SourceSpan:
    """Location of a text span inside a source file.

    ``char_start`` is inclusive, ``char_end`` is exclusive, both relative to the
    normalized full text of the document, not to the page. ``page`` is 1-based
    when the parser has pages, otherwise ``None``. ``section`` is the nearest
    heading text, or ``None``.
    """

    document_id: str
    source_path: str
    page: int | None
    section: str | None
    char_start: int
    char_end: int


@dataclass(frozen=True, slots=True)
class TextBlock:
    text: str
    page: int | None
    section: str | None
    char_start: int
    char_end: int


@dataclass(frozen=True, slots=True)
class ParsedDocument:
    document_id: str
    source_path: str
    media_type: str
    blocks: tuple[TextBlock, ...]


@dataclass(frozen=True, slots=True)
class Chunk:
    chunk_id: str
    text: str
    metadata: SourceSpan
    embedding: tuple[float, ...] | None


@dataclass(frozen=True, slots=True)
class RetrievedChunk:
    chunk: Chunk
    score: float


@dataclass(frozen=True, slots=True)
class IngestReport:
    document_id: str
    chunk_count: int
    concept_count: int
