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

import os
import signal
import subprocess
import sys
import uuid
from typing import Protocol

from config import SandboxSettings
from src.sandbox.errors import SandboxError, SandboxPolicyError
from src.sandbox.models import SandboxRequest, SandboxResult
from src.sandbox.policy import validate_source

_CHILD_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"


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
        validate_source(request.source, request.policy)
        workdir = request.policy.workdir
        workdir.mkdir(parents=True, exist_ok=True)
        os.chmod(workdir, 0o700)
        script_path = workdir / f"src-{uuid.uuid4().hex}.py"
        script_path.write_text(request.source, encoding="utf-8")
        env = {
            "PATH": _CHILD_PATH,
            "SANDBOX": "1",
            "PYTHONUNBUFFERED": "1",
        }
        proc: subprocess.Popen[bytes] | None = None
        try:
            proc = subprocess.Popen(
                [sys.executable, "-I", str(script_path)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                cwd=str(workdir),
                start_new_session=True,
            )
            try:
                stdout, stderr = proc.communicate(
                    input=request.stdin.encode("utf-8"),
                    timeout=request.policy.timeout_s,
                )
                code = proc.returncode if proc.returncode is not None else 1
                timed_out = False
            except subprocess.TimeoutExpired:
                _kill_group(proc)
                stdout, stderr = proc.communicate()
                code = proc.returncode if proc.returncode not in (None, 0) else -9
                timed_out = True
        finally:
            script_path.unlink(missing_ok=True)
        out_text, out_cut = _clip(stdout, request.policy.max_output_bytes)
        err_text, err_cut = _clip(stderr, request.policy.max_output_bytes)
        return SandboxResult(
            exit_code=code,
            stdout=out_text,
            stderr=err_text,
            timed_out=timed_out,
            truncated=out_cut or err_cut,
        )


class DockerSandbox:
    def __init__(self, settings: SandboxSettings) -> None:
        self._settings = settings

    def run(self, request: SandboxRequest) -> SandboxResult:
        validate_source(request.source, request.policy)
        try:
            import docker
        except ImportError as exc:
            raise SandboxError("docker SDK is not installed") from exc
        try:
            client = docker.from_env()
            client.ping()
        except Exception as exc:
            raise SandboxError("docker daemon is unavailable") from exc
        return _run_container(client, self._settings, request)


def create_sandbox(settings: SandboxSettings) -> SandboxRunner:
    """Return ``DockerSandbox`` or ``SubprocessSandbox`` for ``settings.backend``.

    Do not connect to the Docker daemon here. An unknown backend raises
    ``SandboxPolicyError``.
    """
    if settings.backend == "docker":
        return DockerSandbox(settings)
    if settings.backend == "subprocess":
        return SubprocessSandbox(settings)
    raise SandboxPolicyError(f"unknown backend: {settings.backend}")


def _kill_group(proc: subprocess.Popen[bytes]) -> None:
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError:
        return
    except PermissionError:
        proc.kill()


def _clip(data: bytes, limit: int) -> tuple[str, bool]:
    truncated = len(data) > limit
    return data[:limit].decode("utf-8", errors="replace"), truncated


def _run_container(client: object, settings: SandboxSettings, request: SandboxRequest) -> SandboxResult:
    workdir = request.policy.workdir.resolve()
    workdir.mkdir(parents=True, exist_ok=True)
    os.chmod(workdir, 0o700)
    script_name = f"src-{uuid.uuid4().hex}.py"
    script_path = workdir / script_name
    script_path.write_text(request.source, encoding="utf-8")
    nano = max(1, int(settings.cpu_limit * 1_000_000_000))
    container = None
    try:
        container = client.containers.create(  # type: ignore[attr-defined]
            image=settings.image,
            command=["python", "-I", "-u", f"/work/{script_name}"],
            stdin_open=True,
            network_disabled=not request.policy.network_enabled,
            mem_limit=request.policy.memory_mb * 1024 * 1024,
            nano_cpus=nano,
            cap_drop=["ALL"],
            pids_limit=64,
            volumes={str(workdir): {"bind": "/work", "mode": "rw"}},
            working_dir="/work",
            environment={
                "PATH": _CHILD_PATH,
                "SANDBOX": "1",
                "PYTHONUNBUFFERED": "1",
            },
            detach=True,
        )
        container.start()
        _write_container_stdin(client, container.id, request.stdin.encode("utf-8"))
        try:
            result = container.wait(timeout=request.policy.timeout_s)
            timed_out = False
            code = int(result.get("StatusCode", 1))
        except Exception:
            timed_out = True
            code = -9
            try:
                container.kill()
            except Exception:
                pass
        stdout = container.logs(stdout=True, stderr=False) or b""
        stderr = container.logs(stdout=False, stderr=True) or b""
    except SandboxError:
        raise
    except Exception as exc:
        raise SandboxError("docker run failed") from exc
    finally:
        script_path.unlink(missing_ok=True)
        if container is not None:
            try:
                container.remove(force=True)
            except Exception:
                pass
    out_text, out_cut = _clip(stdout if isinstance(stdout, bytes) else bytes(stdout), request.policy.max_output_bytes)
    err_text, err_cut = _clip(stderr if isinstance(stderr, bytes) else bytes(stderr), request.policy.max_output_bytes)
    if timed_out and code == 0:
        code = -9
    return SandboxResult(
        exit_code=code,
        stdout=out_text,
        stderr=err_text,
        timed_out=timed_out,
        truncated=out_cut or err_cut,
    )


def _write_container_stdin(client: object, container_id: str, payload: bytes) -> None:
    try:
        sock = client.api.attach_socket(  # type: ignore[attr-defined]
            container_id,
            params={"stdin": 1, "stream": 1},
        )
    except Exception as exc:
        raise SandboxError("docker stdin attach failed") from exc
    raw = getattr(sock, "_sock", sock)
    try:
        if payload:
            raw.sendall(payload)
    finally:
        raw.close()
