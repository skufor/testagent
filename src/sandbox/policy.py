"""Static policy checks. No process is spawned here."""

from __future__ import annotations

import ast

from config import SandboxSettings
from src.sandbox.errors import SandboxPolicyError
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

_MAX_SOURCE_CHARS = 100_000
_FORBIDDEN_CALLS: frozenset[str] = frozenset(
    {
        "eval",
        "exec",
        "compile",
        "open",
        "__import__",
        "globals",
        "locals",
        "getattr",
        "setattr",
        "delattr",
    }
)
_FORBIDDEN_ATTRS: frozenset[str] = frozenset(
    {
        "__subclasses__",
        "__globals__",
        "__builtins__",
        "__bases__",
        "__mro__",
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
    if settings.timeout_s <= 0 or settings.memory_mb < 1:
        raise SandboxPolicyError("timeout and memory must be positive")
    imports = DEFAULT_ALLOWED_IMPORTS if allowed_imports is None else allowed_imports
    return SandboxPolicy(
        allowed_imports=imports,
        timeout_s=settings.timeout_s,
        memory_mb=settings.memory_mb,
        network_enabled=settings.network_enabled,
        max_output_bytes=settings.max_output_bytes,
        workdir=settings.workdir,
    )


def validate_source(source: str, policy: SandboxPolicy) -> None:
    """Raise ``SandboxPolicyError`` without executing ``source``."""
    if source.strip() == "":
        raise SandboxPolicyError("empty source")
    if len(source) > _MAX_SOURCE_CHARS:
        raise SandboxPolicyError("source exceeds 100000 characters")
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        raise SandboxPolicyError("syntax error") from exc
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                _check_module(alias.name, policy)
        elif isinstance(node, ast.ImportFrom):
            if node.level and node.module is None:
                raise SandboxPolicyError("relative import is not allowed")
            module = node.module or ""
            if module == "":
                raise SandboxPolicyError("relative import is not allowed")
            _check_module(module, policy)
        elif isinstance(node, ast.Call):
            name = _call_name(node.func)
            if name in _FORBIDDEN_CALLS:
                raise SandboxPolicyError(f"call is not allowed: {name}")
        elif isinstance(node, ast.Attribute) and node.attr in _FORBIDDEN_ATTRS:
            raise SandboxPolicyError(f"attribute is not allowed: {node.attr}")


def _check_module(module: str, policy: SandboxPolicy) -> None:
    top = module.split(".", 1)[0]
    if top not in policy.allowed_imports:
        raise SandboxPolicyError(f"import is not allowed: {top}")


def _call_name(func: ast.expr) -> str:
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        return func.attr
    return ""
