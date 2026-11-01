"""Export DTO. Exporters do not invent sections; they render this object."""

from __future__ import annotations

from dataclasses import dataclass

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
