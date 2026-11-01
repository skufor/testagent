"""Study agent orchestrator.

Call order for ``answer``:
1. ``Retriever.search``
2. ``KnowledgeGraph.expand`` for concepts of the hit documents
3. ``LLMClient.complete`` with citations constrained to retrieved spans
4. If ``execute_code`` and the completion contains one fenced ```python block,
   ``SandboxRunner.run`` on that block only
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from src.core.llm_client import ChatMessage, CompletionRequest, LLMClient
from src.documents.docx_exporter import DocxExporter
from src.documents.errors import ExportError
from src.documents.models import ReportDocument, ReportSection
from src.documents.pdf_exporter import PdfExporter
from src.knowledge.graph import KnowledgeGraph
from src.rag.models import RetrievedChunk, SourceSpan
from src.rag.retriever import Retriever
from src.sandbox.errors import SandboxPolicyError
from src.sandbox.models import SandboxPolicy, SandboxRequest, SandboxResult
from src.sandbox.policy import DEFAULT_ALLOWED_IMPORTS
from src.sandbox.runner import SandboxRunner

ExportFormat = Literal["docx", "pdf"]
_FENCE = re.compile(r"```python[ \t]*\n(.*?)```", re.DOTALL | re.IGNORECASE)
_CITE = re.compile(r"(\S+)@(\d+):(\d+)")


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
        if question.strip() == "":
            raise ValueError("question is blank")
        hits = self._retriever.search(question)
        neighbors = self._neighbors(hits)
        completion = self._llm.complete(
            CompletionRequest(
                messages=[
                    ChatMessage(
                        role="system",
                        content=(
                            "Answer only from the provided spans. "
                            "Cite a span as document_id@char_start:char_end. "
                            "Do not invent spans."
                        ),
                    ),
                    ChatMessage(role="user", content=_prompt(question, hits, neighbors)),
                ],
                temperature=0.0,
            )
        )
        citations = _citations(completion.text, hits)
        executed: SandboxResult | None = None
        if execute_code:
            blocks = [block.strip("\n") for block in _FENCE.findall(completion.text)]
            if len(blocks) > 1:
                raise SandboxPolicyError("more than one python block")
            if len(blocks) == 1:
                executed = self._sandbox.run(
                    SandboxRequest(
                        source=blocks[0] + "\n",
                        stdin="",
                        policy=SandboxPolicy(
                            allowed_imports=DEFAULT_ALLOWED_IMPORTS,
                            timeout_s=5.0,
                            memory_mb=256,
                            network_enabled=False,
                            max_output_bytes=65536,
                            workdir=Path.cwd() / "var" / "sandbox",
                        ),
                    )
                )
        return AgentAnswer(text=completion.text, citations=citations, executed=executed)

    def export_answer(
        self,
        answer: AgentAnswer,
        destination: Path,
        fmt: ExportFormat,
    ) -> Path:
        """Render ``answer`` to ``destination`` via the selected exporter. Return the path written."""
        report = self.to_report(answer, "Answer")
        if fmt == "docx":
            return self._docx_exporter.export(report, destination)
        if fmt == "pdf":
            return self._pdf_exporter.export(report, destination)
        raise ExportError(destination, "unsupported format")

    def to_report(self, answer: AgentAnswer, title: str) -> ReportDocument:
        """Map an answer onto the export DTO. No I/O."""
        return ReportDocument(
            title=title,
            author="study-agent",
            sections=(ReportSection(heading=title, body=answer.text, level=1),),
            citations=answer.citations,
        )

    def _neighbors(self, hits: list[RetrievedChunk]) -> list:
        document_ids = {hit.chunk.metadata.document_id for hit in hits}
        if not document_ids:
            return []
        seeds = [
            concept.concept_id
            for concept in self._graph.snapshot().nodes
            if concept.document_id in document_ids
        ]
        return self._graph.expand(seeds, 1)


def _prompt(question: str, hits: list[RetrievedChunk], neighbors: list) -> str:
    lines = [f"Question: {question}", "Spans:"]
    if not hits:
        lines.append("(none)")
    for hit in hits:
        meta = hit.chunk.metadata
        lines.append(f"{meta.document_id}@{meta.char_start}:{meta.char_end} {hit.chunk.text}")
    if neighbors:
        lines.append("Concepts: " + ", ".join(concept.label for concept in neighbors))
    return "\n".join(lines)


def _citations(text: str, hits: list[RetrievedChunk]) -> tuple[SourceSpan, ...]:
    by_key = {
        (hit.chunk.metadata.document_id, hit.chunk.metadata.char_start, hit.chunk.metadata.char_end): hit.chunk.metadata
        for hit in hits
    }
    found: list[SourceSpan] = []
    seen: set[tuple[str, int, int]] = set()
    for document_id, start, end in _CITE.findall(text):
        key = (document_id, int(start), int(end))
        span = by_key.get(key)
        if span is None or key in seen:
            continue
        seen.add(key)
        found.append(span)
    return tuple(found)
