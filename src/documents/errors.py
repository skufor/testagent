"""Export failures. Raised before a partial file is left at ``destination``."""

from __future__ import annotations

from pathlib import Path


class ExportError(Exception):
    def __init__(self, path: Path, reason: str) -> None:
        super().__init__(f"{path}: {reason}")
        self.path = path
        self.reason = reason
