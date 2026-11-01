"""Sandbox failures that abort before a child process is started, or that the runner cannot classify."""

from __future__ import annotations


class SandboxError(Exception):
    """Base class."""


class SandboxPolicyError(SandboxError):
    """Source or request violates ``SandboxPolicy``. Nothing was executed."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class SandboxTimeoutError(SandboxError):
    """Reserved for runners that choose to raise instead of returning ``timed_out=True``.

    The contract of ``SandboxRunner.run`` is to return ``SandboxResult`` with
    ``timed_out=True`` and not raise this type on a CPU timeout.
    """
