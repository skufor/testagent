"""Deterministic identifiers. No randomness."""

from __future__ import annotations

import hashlib


def stable_id(*parts: str) -> str:
    """Return the hex SHA-256 of ``parts`` joined by ``\\x1f``.

    Empty ``parts`` is an error for the implementation (``ValueError``).
    """
    if not parts:
        raise ValueError("stable_id requires at least one part")
    payload = "\x1f".join(parts).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
