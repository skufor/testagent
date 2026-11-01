"""Static policy checks. No process is spawned here."""

from __future__ import annotations

from config import SandboxSettings
from src.sandbox.models import SandboxPolicy

DEFAULT_ALLOWED_IMPORTS: frozenset[str] = frozenset(
    {
        "math",
        "statistics",
        "decimal",
        "fractions",
        "json",
        "re",
        "datetime",
        "collections",
        "itertools",
        "functools",
    }
)


def build_policy(
    settings: SandboxSettings,
    allowed_imports: frozenset[str] | None = None,
) -> SandboxPolicy:
    """Copy numeric limits from ``settings``. Imports default to ``DEFAULT_ALLOWED_IMPORTS``.

    ``network_enabled`` is copied, not forced. A non-positive timeout or memory
    raises ``SandboxPolicyError``.
    """
    pass


def validate_source(source: str, policy: SandboxPolicy) -> None:
    """Raise ``SandboxPolicyError`` without executing ``source``.

    Reject: empty or whitespace-only source, source larger than 100_000 chars,
    syntax errors, ``import`` / ``from`` of a module outside
    ``policy.allowed_imports``, calls of ``eval``, ``exec``, ``compile``,
    ``open``, ``__import__``, attribute access of ``__subclasses__``,
    ``__globals__``, ``__builtins__``.
    """
    pass
