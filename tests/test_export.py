"""Export and agent report contract tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from docx import Document
from pypdf import PdfReader

from config import ExportSettings
from src.core.agent import AgentAnswer, StudyAgent
from src.core.llm_client import CompletionResult
from src.documents.docx_exporter import DocxExporter
from src.documents.errors import ExportError
from src.documents.models import ReportDocument, ReportSection
from src.documents.pdf_exporter import PdfExporter
from src.knowledge.graph import KnowledgeGraph
from src.rag.models import Chunk, RetrievedChunk, SourceSpan
from src.sandbox.models import SandboxResult


def _settings(tmp_path: Path) -> ExportSettings:
    return ExportSettings(output_dir=tmp_path, pdf_font="Helvetica", docx_font="Calibri")


def _report(level: int = 1, title: str = "Отчёт") -> ReportDocument:
    return ReportDocument(
        title=title,
        author="study-agent",
        sections=(ReportSection(heading=title, body="Текст раздела", level=level),),
        citations=(),
    )


def test_docx_contains_title(tmp_path: Path) -> None:
    destination = tmp_path / "out.docx"
    DocxExporter(_settings(tmp_path)).export(_report(), destination)
    package = Document(str(destination))
    assert package.core_properties.title == "Отчёт"
    assert any("Отчёт" in paragraph.text for paragraph in package.paragraphs)


def test_pdf_contains_title(tmp_path: Path) -> None:
    destination = tmp_path / "out.pdf"
    PdfExporter(_settings(tmp_path)).export(_report(), destination)
    reader = PdfReader(str(destination))
    assert reader.metadata is not None
    assert reader.metadata.title == "Отчёт"


def test_invalid_level_does_not_create_file(tmp_path: Path) -> None:
    destination = tmp_path / "nested" / "out.docx"
    with pytest.raises(ExportError):
        DocxExporter(_settings(tmp_path)).export(_report(level=0), destination)
    assert not destination.exists()
    assert not destination.parent.exists()


def test_agent_drops_unknown_citations_and_skips_sandbox() -> None:
    span = SourceSpan("doc", "note.txt", None, "Intro", 0, 5)
    hit = RetrievedChunk(
        chunk=Chunk("c", "alpha", span, (1.0, 0.0)),
        score=1.0,
    )
    calls: list[object] = []

    class Retriever:
        def search(self, query: str, top_k: int | None = None) -> list[RetrievedChunk]:
            return [hit]

    class LLM:
        def complete(self, request: object) -> CompletionResult:
            return CompletionResult("see doc@0:5 and missing@9:10", "m", 0, 0, "stop")

    class Sandbox:
        def run(self, request: object) -> SandboxResult:
            calls.append(request)
            raise AssertionError("sandbox must not run")

    agent = StudyAgent(
        llm=LLM(),
        retriever=Retriever(),  # type: ignore[arg-type]
        graph=KnowledgeGraph(),
        sandbox=Sandbox(),  # type: ignore[arg-type]
        docx_exporter=DocxExporter(_settings(Path("."))),
        pdf_exporter=PdfExporter(_settings(Path("."))),
    )
    answer = agent.answer("what is alpha?", execute_code=False)
    assert answer.citations == (span,)
    assert answer.executed is None
    assert calls == []
    report = agent.to_report(answer, "Отчёт")
    assert report.author == "study-agent"
    assert report.sections[0].heading == "Отчёт"
    assert report.sections[0].level == 1
    with pytest.raises(ValueError):
        agent.answer("   ")


def test_agent_exports_answer(tmp_path: Path) -> None:
    destination = tmp_path / "answer.docx"
    agent = StudyAgent(
        llm=_Unused(),
        retriever=_Unused(),  # type: ignore[arg-type]
        graph=KnowledgeGraph(),
        sandbox=_Unused(),  # type: ignore[arg-type]
        docx_exporter=DocxExporter(_settings(tmp_path)),
        pdf_exporter=PdfExporter(_settings(tmp_path)),
    )
    answer = AgentAnswer("body", (), None)
    written = agent.export_answer(answer, destination, "docx")
    assert written == destination
    assert Document(str(destination)).core_properties.author == "study-agent"


class _Unused:
    pass
