"""Isolated execution of model-generated Python.

Two backends share ``SandboxRunner.run``:
- ``SubprocessSandbox``: ``subprocess`` with a fresh environment, ``resource``
  limits where the platform provides them, process group kill on timeout.
- ``DockerSandbox``: Docker SDK, image from settings, ``network_disabled``
  unless ``policy.network_enabled``, memory and nano-cpu limits, no host mounts
  except an empty workdir, ``cap_drop=['ALL']``, ``user`` other than root when
  the image allows it.

Neither backend inherits ``os.environ``. The child environment is exactly
``{"PATH": <minimal>, "SANDBOX": "1", "PYTHONUNBUFFERED": "1"}``.
"""

from __future__ import annotations

from typing import Protocol

from config import SandboxSettings
from src.sandbox.models import SandboxRequest, SandboxResult


class SandboxRunner(Protocol):
    def run(self, request: SandboxRequest) -> SandboxResult:
        """Execute ``request.source``.

        Call ``validate_source`` first and let ``SandboxPolicyError`` propagate.
        On timeout: kill the child, return ``timed_out=True``, do not raise.
        Stdout and stderr are decoded as UTF-8 with ``errors='replace'`` and
        cut to ``policy.max_output_bytes`` each; ``truncated=True`` if either
        was cut. ``stdin`` is written to the child stdin and closed.
        """


class SubprocessSandbox:
    def __init__(self, settings: SandboxSettings) -> None:
        self._settings = settings

    def run(self, request: SandboxRequest) -> SandboxResult:
        pass


class DockerSandbox:
    def __init__(self, settings: SandboxSettings) -> None:
        self._settings = settings

    def run(self, request: SandboxRequest) -> SandboxResult:
        pass


def create_sandbox(settings: SandboxSettings) -> SandboxRunner:
    """Return ``DockerSandbox`` or ``SubprocessSandbox`` for ``settings.backend``.

    Do not connect to the Docker daemon here. An unknown backend raises
    ``SandboxPolicyError``.
    """
    pass
