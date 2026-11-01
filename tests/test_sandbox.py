"""Contract tests for the sandbox policy and runners.

Every test in this module fails while ``build_policy``, ``validate_source``,
``SubprocessSandbox.run`` and ``create_sandbox`` are stubs.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from config import SandboxSettings
from src.sandbox.errors import SandboxPolicyError
from src.sandbox.models import SandboxPolicy, SandboxRequest, SandboxResult
from src.sandbox.policy import build_policy, validate_source
from src.sandbox.runner import DockerSandbox, SubprocessSandbox, create_sandbox


def _settings(tmp_path: Path, **overrides: object) -> SandboxSettings:
    data: dict[str, object] = {
        "backend": "subprocess",
        "image": "python:3.11-slim",
        "timeout_s": 2.0,
        "memory_mb": 128,
        "cpu_limit": 0.5,
        "network_enabled": False,
        "max_output_bytes": 4096,
        "workdir": tmp_path / "work",
    }
    data.update(overrides)
    return SandboxSettings(**data)  # type: ignore[arg-type]


def _policy(tmp_path: Path, **overrides: object) -> SandboxPolicy:
    data: dict[str, object] = {
        "allowed_imports": frozenset({"math"}),
        "timeout_s": 2.0,
        "memory_mb": 128,
        "network_enabled": False,
        "max_output_bytes": 64,
        "workdir": tmp_path / "work",
    }
    data.update(overrides)
    return SandboxPolicy(**data)  # type: ignore[arg-type]


def test_build_policy_copies_limits_and_default_imports(tmp_path: Path) -> None:
    policy = build_policy(_settings(tmp_path, network_enabled=False, memory_mb=64))
    assert isinstance(policy, SandboxPolicy)
    assert policy.network_enabled is False
    assert policy.memory_mb == 64
    assert policy.timeout_s == 2.0
    assert "math" in policy.allowed_imports
    assert "os" not in policy.allowed_imports
    assert "socket" not in policy.allowed_imports
    assert "subprocess" not in policy.allowed_imports


def test_build_policy_rejects_non_positive_memory(tmp_path: Path) -> None:
    with pytest.raises(SandboxPolicyError):
        build_policy(_settings(tmp_path, memory_mb=0))


def test_validate_source_rejects_empty() -> None:
    policy = SandboxPolicy(
        allowed_imports=frozenset({"math"}),
        timeout_s=1.0,
        memory_mb=64,
        network_enabled=False,
        max_output_bytes=128,
        workdir=Path("."),
    )
    with pytest.raises(SandboxPolicyError):
        validate_source("   \n", policy)


def test_validate_source_rejects_forbidden_import() -> None:
    policy = SandboxPolicy(
        allowed_imports=frozenset({"math"}),
        timeout_s=1.0,
        memory_mb=64,
        network_enabled=False,
        max_output_bytes=128,
        workdir=Path("."),
    )
    with pytest.raises(SandboxPolicyError):
        validate_source("import os\nprint(os.getcwd())\n", policy)


def test_validate_source_rejects_eval() -> None:
    policy = SandboxPolicy(
        allowed_imports=frozenset({"math"}),
        timeout_s=1.0,
        memory_mb=64,
        network_enabled=False,
        max_output_bytes=128,
        workdir=Path("."),
    )
    with pytest.raises(SandboxPolicyError):
        validate_source("print(eval('1+1'))\n", policy)


def test_subprocess_echo_stdout(tmp_path: Path) -> None:
    runner = SubprocessSandbox(_settings(tmp_path))
    result = runner.run(
        SandboxRequest(source="print(40 + 2)\n", stdin="", policy=_policy(tmp_path))
    )
    assert isinstance(result, SandboxResult)
    assert result.exit_code == 0
    assert result.stdout.strip() == "42"
    assert result.timed_out is False
    assert result.truncated is False
    assert result.stderr == ""


def test_subprocess_forwards_stdin(tmp_path: Path) -> None:
    source = "import sys\nprint(sys.stdin.read().strip())\n"
    policy = _policy(tmp_path, allowed_imports=frozenset({"sys"}))
    runner = SubprocessSandbox(_settings(tmp_path))
    result = runner.run(SandboxRequest(source=source, stdin="hello\n", policy=policy))
    assert isinstance(result, SandboxResult)
    assert result.exit_code == 0
    assert result.stdout.strip() == "hello"


def test_subprocess_nonzero_exit(tmp_path: Path) -> None:
    runner = SubprocessSandbox(_settings(tmp_path))
    result = runner.run(
        SandboxRequest(source="import math\nraise SystemExit(3)\n", stdin="", policy=_policy(tmp_path))
    )
    assert isinstance(result, SandboxResult)
    assert result.exit_code == 3
    assert result.timed_out is False


def test_subprocess_timeout_sets_flag(tmp_path: Path) -> None:
    policy = _policy(tmp_path, timeout_s=0.3, allowed_imports=frozenset())
    runner = SubprocessSandbox(_settings(tmp_path, timeout_s=0.3))
    result = runner.run(
        SandboxRequest(source="while True:\n    pass\n", stdin="", policy=policy)
    )
    assert isinstance(result, SandboxResult)
    assert result.timed_out is True
    assert result.exit_code != 0


def test_subprocess_truncates_stdout(tmp_path: Path) -> None:
    policy = _policy(tmp_path, max_output_bytes=8, allowed_imports=frozenset())
    runner = SubprocessSandbox(_settings(tmp_path, max_output_bytes=8))
    result = runner.run(
        SandboxRequest(source="print('0123456789abcdef')\n", stdin="", policy=policy)
    )
    assert isinstance(result, SandboxResult)
    assert result.truncated is True
    assert len(result.stdout.encode("utf-8")) <= 8


def test_subprocess_does_not_leak_host_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SENTINEL_HOST_SECRET", "super-secret")
    policy = _policy(tmp_path, allowed_imports=frozenset({"os"}))
    source = "import os\nprint(os.environ.get('SENTINEL_HOST_SECRET', 'absent'))\n"
    runner = SubprocessSandbox(_settings(tmp_path))
    result = runner.run(SandboxRequest(source=source, stdin="", policy=policy))
    assert isinstance(result, SandboxResult)
    assert result.exit_code == 0
    assert result.stdout.strip() == "absent"
    assert "super-secret" not in result.stdout
    assert "super-secret" not in result.stderr


def test_create_sandbox_selects_backend(tmp_path: Path) -> None:
    docker_runner = create_sandbox(_settings(tmp_path, backend="docker"))
    subprocess_runner = create_sandbox(_settings(tmp_path, backend="subprocess"))
    assert isinstance(docker_runner, DockerSandbox)
    assert isinstance(subprocess_runner, SubprocessSandbox)


def test_forbidden_import_is_not_executed(tmp_path: Path) -> None:
    runner = SubprocessSandbox(_settings(tmp_path))
    with pytest.raises(SandboxPolicyError):
        runner.run(
            SandboxRequest(
                source="import os\nos.system('echo pwned')\n",
                stdin="",
                policy=_policy(tmp_path, allowed_imports=frozenset({"math"})),
            )
        )
