"""DOCX export via python-docx. Stub. See TODO.md task 4."""

from __future__ import annotations

from pathlib import Path

from config import ExportSettings
from src.documents.models import ReportDocument


class DocxExporter:
    def __init__(self, settings: ExportSettings) -> None:
        self._settings = settings

    def export(self, document: ReportDocument, destination: Path) -> Path:
        """Write ``document`` to ``destination`` (suffix ``.docx``). Return ``destination``.

        Creates parent directories. Writes to a temporary file in the same
        directory and replaces ``destination`` only after the package is closed.
        """
        pass
