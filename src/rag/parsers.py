"""Source parsers. Each parser fills ``SourceSpan`` fields; none embed text."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from src.rag.models import ParsedDocument


class ParseError(Exception):
    """File cannot be decoded into text blocks."""

    def __init__(self, path: Path, reason: str) -> None:
        super().__init__(f"{path}: {reason}")
        self.path = path
        self.reason = reason


class DocumentParser(Protocol):
    def parse(self, path: Path, document_id: str) -> ParsedDocument:
        """Read ``path``. ``document_id`` is caller-supplied and stored as-is."""


class PlainTextParser:
    """UTF-8 text, ``media_type='text/plain'``. Reject other encodings."""

    def parse(self, path: Path, document_id: str) -> ParsedDocument:
        pass


class PdfParser:
    """PDF via pypdf. One ``TextBlock`` per page. Empty pages are omitted."""

    def parse(self, path: Path, document_id: str) -> ParsedDocument:
        pass


class DocxParser:
    """DOCX via python-docx. Heading paragraphs set ``section`` until the next heading."""

    def parse(self, path: Path, document_id: str) -> ParsedDocument:
        pass


def parser_for(path: Path) -> DocumentParser:
    """Select a parser by suffix ``.txt``, ``.md``, ``.pdf``, ``.docx``.

    Raise ``ParseError`` for a missing file or an unsupported suffix.
    """
    pass
