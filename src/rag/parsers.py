"""Source parsers. Each parser fills block offsets; none embed text."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from src.rag.models import ParsedDocument, TextBlock
from src.utils.text import normalize_ws


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
    """UTF-8 text. ``.md`` records ATX headings as ``section``."""

    def parse(self, path: Path, document_id: str) -> ParsedDocument:
        text = _read_utf8(path)
        markdown = path.suffix.lower() == ".md"
        blocks = _text_blocks(text, markdown=markdown)
        media = "text/markdown" if markdown else "text/plain"
        return ParsedDocument(
            document_id=document_id,
            source_path=str(path),
            media_type=media,
            blocks=blocks,
        )


class PdfParser:
    """PDF via pypdf. One ``TextBlock`` per non-empty page. Empty pages are omitted."""

    def parse(self, path: Path, document_id: str) -> ParsedDocument:
        if not path.is_file():
            raise ParseError(path, "file not found")
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(path))
            pages = list(reader.pages)
        except ParseError:
            raise
        except Exception as exc:
            raise ParseError(path, "invalid pdf") from exc
        pieces: list[tuple[str, int]] = []
        for index, page in enumerate(pages, start=1):
            try:
                raw = page.extract_text() or ""
            except Exception as exc:
                raise ParseError(path, "invalid pdf") from exc
            text = normalize_ws(raw).strip()
            if text == "":
                continue
            pieces.append((text, index))
        blocks = _placed(pieces, page_of=lambda item: item[1], text_of=lambda item: item[0], section_of=lambda _item: None)
        return ParsedDocument(
            document_id=document_id,
            source_path=str(path),
            media_type="application/pdf",
            blocks=blocks,
        )


class DocxParser:
    """DOCX via python-docx. Heading paragraphs set ``section`` until the next heading."""

    def parse(self, path: Path, document_id: str) -> ParsedDocument:
        if not path.is_file():
            raise ParseError(path, "file not found")
        try:
            from docx import Document

            document = Document(str(path))
        except Exception as exc:
            raise ParseError(path, "invalid docx") from exc
        section: str | None = None
        pieces: list[tuple[str, str | None]] = []
        for paragraph in document.paragraphs:
            style_name = ""
            if paragraph.style is not None and paragraph.style.name:
                style_name = paragraph.style.name
            text = normalize_ws(paragraph.text).strip()
            if style_name.lower().startswith("heading") and text != "":
                section = text
            if text == "":
                continue
            pieces.append((text, section))
        blocks = _placed(
            pieces,
            page_of=lambda _item: None,
            text_of=lambda item: item[0],
            section_of=lambda item: item[1],
        )
        return ParsedDocument(
            document_id=document_id,
            source_path=str(path),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            blocks=blocks,
        )


def parser_for(path: Path) -> DocumentParser:
    """Select a parser by suffix ``.txt``, ``.md``, ``.pdf``, ``.docx``.

    Raise ``ParseError`` for a missing file or an unsupported suffix.
    """
    if not path.is_file():
        raise ParseError(path, "file not found")
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return PlainTextParser()
    if suffix == ".pdf":
        return PdfParser()
    if suffix == ".docx":
        return DocxParser()
    raise ParseError(path, f"unsupported suffix: {suffix}")


def _read_utf8(path: Path) -> str:
    if not path.is_file():
        raise ParseError(path, "file not found")
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise ParseError(path, "not utf-8") from exc
    except OSError as exc:
        raise ParseError(path, "unreadable") from exc


def _text_blocks(text: str, *, markdown: bool) -> tuple[TextBlock, ...]:
    import re

    normalized = normalize_ws(text)
    if normalized.strip() == "":
        return ()
    if not markdown:
        return (TextBlock(text=normalized, page=None, section=None, char_start=0, char_end=len(normalized)),)
    heading_re = re.compile(r"^(#{1,6})[ \t]+(\S.*?)\s*$")
    section: str | None = None
    pieces: list[tuple[str, str | None]] = []
    lines = normalized.split("\n")
    for line in lines:
        match = heading_re.match(line)
        if match is not None:
            section = match.group(2).strip()
        if line.strip() == "":
            continue
        pieces.append((line, section))
    return _placed(
        pieces,
        page_of=lambda _item: None,
        text_of=lambda item: item[0],
        section_of=lambda item: item[1],
    )


def _placed(items: list, *, page_of, text_of, section_of) -> tuple[TextBlock, ...]:  # type: ignore[no-untyped-def]
    blocks: list[TextBlock] = []
    cursor = 0
    for item in items:
        text = text_of(item)
        if blocks:
            cursor += 1
        start = cursor
        end = start + len(text)
        blocks.append(
            TextBlock(
                text=text,
                page=page_of(item),
                section=section_of(item),
                char_start=start,
                char_end=end,
            )
        )
        cursor = end
    return tuple(blocks)
