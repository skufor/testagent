"""Whitespace normalization shared by the chunker and exporters."""

from __future__ import annotations


def normalize_ws(text: str) -> str:
    """Collapse runs of spaces and tabs to a single space. Preserve ``\\n``.

    Does not strip. ``CRLF`` and ``CR`` become ``\\n``.
    """
    pass
