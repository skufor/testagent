"""Sandbox request and result. No I/O."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class SandboxPolicy:
    """Limits applied to one run.

    ``allowed_imports`` is the exact set of top-level modules the source may
    import. Submodules are allowed only when the parent is in the set
    (``json.decoder`` requires ``json``). ``os``, ``sys``, ``subprocess``,
    ``socket``, ``pathlib``, ``importlib``, ``ctypes``, ``builtins`` overrides
    via ``__import__`` are not in the default set.
    """

    allowed_imports: frozenset[str]
    timeout_s: float
    memory_mb: int
    network_enabled: bool
    max_output_bytes: int
    workdir: Path


@dataclass(frozen=True, slots=True)
class SandboxRequest:
    source: str
    stdin: str
    policy: SandboxPolicy


@dataclass(frozen=True, slots=True)
class SandboxResult:
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool
    truncated: bool
