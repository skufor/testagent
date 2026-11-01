"""Study agent orchestrator.

Call order for ``answer`` (not implemented):
1. ``Retriever.search``
2. ``KnowledgeGraph.expand`` for neighbor concepts of the hit set
3. ``LLMClient.complete`` with citations constrained to retrieved spans
4. If ``execute_code`` and the completion contains one fenced ```python block,
   ``SandboxRunner.run`` on that block only
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from src.core.llm_client import LLMClient
from src.documents.docx_exporter import DocxExporter
from src.documents.models import ReportDocument
from src.documents.pdf_exporter import PdfExporter
from src.knowledge.graph import KnowledgeGraph
from src.rag.models import SourceSpan
from src.rag.retriever import Retriever
from src.sandbox.models import SandboxResult
from src.sandbox.runner import SandboxRunner

ExportFormat = Literal["docx", "pdf"]


@dataclass(frozen=True, slots=True)
class AgentAnswer:
    text: str
    citations: tuple[SourceSpan, ...]
    executed: SandboxResult | None


class StudyAgent:
    def __init__(
        self,
        llm: LLMClient,
        retriever: Retriever,
        graph: KnowledgeGraph,
        sandbox: SandboxRunner,
        docx_exporter: DocxExporter,
        pdf_exporter: PdfExporter,
    ) -> None:
        self._llm = llm
        self._retriever = retriever
        self._graph = graph
        self._sandbox = sandbox
        self._docx_exporter = docx_exporter
        self._pdf_exporter = pdf_exporter

    def answer(self, question: str, *, execute_code: bool = False) -> AgentAnswer:
        """Answer ``question`` using retrieval, the graph, and optionally one sandbox run.

        ``question`` must be non-blank. Code execution never receives host env
        or a second code block. Citations are a subset of retrieved spans.
        """
        pass

    def export_answer(
        self,
        answer: AgentAnswer,
        destination: Path,
        fmt: ExportFormat,
    ) -> Path:
        """Render ``answer`` to ``destination`` via the selected exporter. Return the path written."""
        pass

    def to_report(self, answer: AgentAnswer, title: str) -> ReportDocument:
        """Map an answer onto the export DTO. No I/O."""
        pass
