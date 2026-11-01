"""Deterministic identifiers. No randomness."""

from __future__ import annotations


def stable_id(*parts: str) -> str:
    """Return the hex SHA-256 of ``parts`` joined by ``\\x1f``.

    Empty ``parts`` is an error for the implementation (``ValueError``).
    """
    pass
