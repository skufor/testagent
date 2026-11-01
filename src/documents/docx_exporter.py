"""DOCX export via python-docx."""

from __future__ import annotations

import os
from pathlib import Path

from config import ExportSettings
from src.documents.errors import ExportError
from src.documents.models import ReportDocument, sections_for_export


class DocxExporter:
    def __init__(self, settings: ExportSettings) -> None:
        self._settings = settings

    def export(self, document: ReportDocument, destination: Path) -> Path:
        """Write ``document`` to ``destination`` (suffix ``.docx``). Return ``destination``."""
        sections = sections_for_export(document, destination, ".docx")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
        try:
            from docx import Document

            package = Document()
            package.core_properties.title = document.title
            package.core_properties.author = document.author
            package.add_heading(document.title, level=0)
            for section in sections:
                heading = package.add_heading(section.heading, level=section.level)
                _font(heading, self._settings.docx_font)
                paragraph = package.add_paragraph(section.body)
                _font(paragraph, self._settings.docx_font)
            package.save(str(temporary))
            os.replace(temporary, destination)
        except ExportError:
            temporary.unlink(missing_ok=True)
            raise
        except Exception as exc:
            temporary.unlink(missing_ok=True)
            raise ExportError(destination, "docx write failed") from exc
        finally:
            if temporary.exists():
                temporary.unlink(missing_ok=True)
        return destination


def _font(paragraph: object, font_name: str) -> None:
    runs = getattr(paragraph, "runs", ())
    for run in runs:
        run.font.name = font_name
