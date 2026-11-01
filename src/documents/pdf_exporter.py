"""PDF export via reportlab. Stub. See TODO.md task 4."""

from __future__ import annotations

from pathlib import Path

from config import ExportSettings
from src.documents.models import ReportDocument


class PdfExporter:
    def __init__(self, settings: ExportSettings) -> None:
        self._settings = settings

    def export(self, document: ReportDocument, destination: Path) -> Path:
        """Write ``document`` to ``destination`` (suffix ``.pdf``). Return ``destination``.

        Uses ``ExportSettings.pdf_font`` when that font is registered, otherwise
        Helvetica. Same temp-file replace rule as ``DocxExporter``.
        """
        pass
