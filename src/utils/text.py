"""Whitespace normalization shared by the chunker and exporters."""

from __future__ import annotations

import re

_WS = re.compile(r"[ \t]+")


def normalize_ws(text: str) -> str:
    """Collapse runs of spaces and tabs to a single space. Preserve ``\\n``.

    Does not strip. ``CRLF`` and ``CR`` become ``\\n``.
    """
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    return _WS.sub(" ", normalized)
