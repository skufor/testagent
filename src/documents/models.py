"""Export DTO. Exporters do not invent sections; they render this object."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from src.documents.errors import ExportError
from src.rag.models import SourceSpan


@dataclass(frozen=True, slots=True)
class ReportSection:
    heading: str
    body: str
    level: int


@dataclass(frozen=True, slots=True)
class ReportDocument:
    title: str
    author: str
    sections: tuple[ReportSection, ...]
    citations: tuple[SourceSpan, ...]


def sections_for_export(document: ReportDocument, destination: Path, suffix: str) -> tuple[ReportSection, ...]:
    """Validate ``document`` before any file is opened. Append citations when present."""
    if destination.suffix.lower() != suffix:
        raise ExportError(destination, "suffix does not match the exporter")
    if destination.exists() and destination.is_dir():
        raise ExportError(destination, "destination is a directory")
    if document.title.strip() == "":
        raise ExportError(destination, "title is empty")
    prepared: list[ReportSection] = []
    for section in document.sections:
        if section.level not in (1, 2, 3):
            raise ExportError(destination, "section level must be 1..3")
        if section.heading.strip() == "":
            raise ExportError(destination, "heading is empty")
        prepared.append(section)
    if document.citations:
        lines = []
        for citation in document.citations:
            page = "" if citation.page is None else str(citation.page)
            section = "" if citation.section is None else citation.section
            lines.append(f"{citation.source_path}\t{page}\t{section}\t{citation.char_start}-{citation.char_end}")
        prepared.append(ReportSection(heading="Источники", body="\n".join(lines), level=1))
    return tuple(prepared)
