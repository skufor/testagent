"""HTTP adapter in front of StudyAgent.

The UI speaks NDJSON on ``POST /ask_stream``. This module does not replace
the agent: it loads settings, keeps the index and graph on disk, and forwards
questions to ``StudyAgent.answer``.
"""

from __future__ import annotations

import json
import threading
from collections import deque
from pathlib import Path
from typing import Iterator

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

from config import load_settings
from src.core.agent import StudyAgent
from src.core.llm_client import LLMError, OpenAICompatibleClient
from src.documents.docx_exporter import DocxExporter
from src.documents.errors import ExportError
from src.documents.models import ReportDocument, ReportSection
from src.documents.pdf_exporter import PdfExporter
from src.knowledge.extractor import ConceptExtractor, ExtractionError
from src.knowledge.graph import KnowledgeGraph
from src.knowledge.models import Concept, GraphSnapshot, Relation
from src.rag.chunker import Chunker
from src.rag.embeddings import EmbeddingError, HashEmbeddings, OpenAICompatibleEmbeddings
from src.rag.ingestor import DocumentIngestor
from src.rag.models import SourceSpan
from src.rag.parsers import ParseError
from src.rag.retriever import Retriever
from src.rag.store import FileVectorStore, IndexError_
from src.sandbox.errors import SandboxPolicyError
from src.sandbox.runner import create_sandbox
from src.utils.ids import stable_id

_ALLOWED = {".txt", ".md", ".pdf", ".docx"}
_HISTORY_LIMIT = 8
_TURN_CHARS = 2000

app = FastAPI(title="study-agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Runtime:
    def __init__(self) -> None:
        self.settings = load_settings()
        self.llm = OpenAICompatibleClient(self.settings.llm)
        model = self.settings.rag.embedding_model
        if model == "local-hash" or model.startswith("local-"):
            self.embeddings = HashEmbeddings()
        else:
            self.embeddings = OpenAICompatibleEmbeddings(self.settings.llm, model)
        self.store = FileVectorStore(self.settings.rag.index_dir)
        self.graph = KnowledgeGraph()
        self._graph_path = self.settings.rag.index_dir / "graph.json"
        self._catalog_path = self.settings.rag.index_dir / "catalog.json"
        self._load_graph()
        self.ingestor = DocumentIngestor(
            Chunker(self.settings.rag.chunk_size, self.settings.rag.chunk_overlap),
            self.embeddings,
            self.store,
            ConceptExtractor(self.llm, self.graph),
            self.graph,
        )
        self.retriever = Retriever(self.store, self.embeddings, self.graph, self.settings.rag.top_k)
        self.agent = StudyAgent(
            self.llm,
            self.retriever,
            self.graph,
            create_sandbox(self.settings.sandbox),
            DocxExporter(self.settings.export),
            PdfExporter(self.settings.export),
        )
        self.history: dict[str, deque[tuple[str, str]]] = {}
        self.lock = threading.Lock()

    def _load_graph(self) -> None:
        if not self._graph_path.exists():
            return
        try:
            raw = json.loads(self._graph_path.read_text(encoding="utf-8"))
            self.graph.restore(_snapshot_from_json(raw))
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            self.graph = KnowledgeGraph()

    def save_graph(self) -> None:
        self._graph_path.parent.mkdir(parents=True, exist_ok=True)
        payload = _snapshot_to_json(self.graph.snapshot())
        temporary = self._graph_path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        temporary.replace(self._graph_path)

    def catalog(self) -> dict[str, dict[str, str]]:
        if not self._catalog_path.exists():
            return {}
        try:
            raw = json.loads(self._catalog_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        items = raw.get("items") if isinstance(raw, dict) else None
        if not isinstance(items, dict):
            return {}
        return {str(key): value for key, value in items.items() if isinstance(value, dict)}

    def save_catalog(self, items: dict[str, dict[str, str]]) -> None:
        self._catalog_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self._catalog_path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps({"items": items}, ensure_ascii=False), encoding="utf-8")
        temporary.replace(self._catalog_path)


def _boot() -> Runtime | None:
    try:
        return Runtime()
    except Exception:
        return None


RUNTIME = _boot()


def _snapshot_to_json(snapshot: GraphSnapshot) -> dict[str, object]:
    return {
        "nodes": [
            {
                "concept_id": node.concept_id,
                "label": node.label,
                "kind": node.kind,
                "document_id": node.document_id,
                "source_refs": [_span_to_json(span) for span in node.source_refs],
            }
            for node in snapshot.nodes
        ],
        "edges": [
            {"source_id": edge.source_id, "target_id": edge.target_id, "predicate": edge.predicate}
            for edge in snapshot.edges
        ],
    }


def _span_to_json(span: SourceSpan) -> dict[str, object]:
    return {
        "document_id": span.document_id,
        "source_path": span.source_path,
        "page": span.page,
        "section": span.section,
        "char_start": span.char_start,
        "char_end": span.char_end,
    }


def _span_from_json(raw: object) -> SourceSpan:
    if not isinstance(raw, dict):
        raise ValueError("span")
    page = raw.get("page")
    section = raw.get("section")
    return SourceSpan(
        document_id=str(raw["document_id"]),
        source_path=str(raw["source_path"]),
        page=page if isinstance(page, int) else None,
        section=section if isinstance(section, str) else None,
        char_start=int(raw["char_start"]),
        char_end=int(raw["char_end"]),
    )


def _snapshot_from_json(raw: object) -> GraphSnapshot:
    if not isinstance(raw, dict):
        raise ValueError("graph")
    nodes = tuple(
        Concept(
            concept_id=str(item["concept_id"]),
            label=str(item["label"]),
            kind=item["kind"],
            document_id=str(item["document_id"]),
            source_refs=tuple(_span_from_json(span) for span in item.get("source_refs", [])),
        )
        for item in raw.get("nodes", [])
    )
    edges = tuple(
        Relation(source_id=str(item["source_id"]), target_id=str(item["target_id"]), predicate=item["predicate"])
        for item in raw.get("edges", [])
    )
    return GraphSnapshot(nodes=nodes, edges=edges)


def _line(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


def _require() -> Runtime:
    if RUNTIME is None:
        raise RuntimeError("agent is not configured")
    return RUNTIME


@app.get("/health")
def health() -> JSONResponse:
    if RUNTIME is None:
        return JSONResponse({"ok": False}, status_code=503)
    return JSONResponse({"ok": True})


@app.get("/library")
def library() -> JSONResponse:
    runtime = _require()
    catalog = runtime.catalog()
    items = []
    for document_id, source_path in runtime.store.documents():
        meta = catalog.get(document_id, {})
        title = str(meta.get("title") or Path(source_path).stem or document_id)
        items.append({"id": document_id, "title": title, "source_path": source_path})
    return JSONResponse({"items": items})


@app.post("/library")
async def upload_library(file: UploadFile = File(...)) -> JSONResponse:
    runtime = _require()
    name = Path(file.filename or "document.txt").name
    suffix = Path(name).suffix.lower()
    if suffix not in _ALLOWED:
        return JSONResponse({"error": "нужен файл txt, md, pdf или docx"}, status_code=400)
    library_dir = runtime.settings.rag.index_dir.parent / "library"
    library_dir.mkdir(parents=True, exist_ok=True)
    destination = library_dir / name
    destination.write_bytes(await file.read())
    document_id = stable_id(name)
    try:
        with runtime.lock:
            report = runtime.ingestor.ingest_path(destination, document_id)
            catalog = runtime.catalog()
            catalog[document_id] = {"title": Path(name).stem, "filename": name}
            runtime.save_catalog(catalog)
            runtime.save_graph()
    except (ParseError, EmbeddingError, ExtractionError, IndexError_, LLMError) as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    return JSONResponse(
        {"id": report.document_id, "title": Path(name).stem, "chunk_count": report.chunk_count, "concept_count": report.concept_count}
    )


@app.delete("/library/{document_id}")
def delete_library(document_id: str) -> JSONResponse:
    runtime = _require()
    with runtime.lock:
        runtime.store.replace_document(document_id, [])
        runtime.graph.remove_document(document_id)
        catalog = runtime.catalog()
        catalog.pop(document_id, None)
        runtime.save_catalog(catalog)
        runtime.save_graph()
    return JSONResponse({"ok": True})


@app.post("/reset_history")
def reset_history(chat_id: str = Form(...)) -> JSONResponse:
    runtime = _require()
    runtime.history.pop(chat_id, None)
    return JSONResponse({"ok": True})


@app.post("/export")
def export_answer(text: str = Form(...), fmt: str = Form(...), title: str = Form("Конспект")) -> Response:
    runtime = _require()
    if fmt not in {"docx", "pdf"}:
        return JSONResponse({"error": "format must be docx or pdf"}, status_code=400)
    safe_title = title.strip() or "Конспект"
    report = ReportDocument(
        title=safe_title,
        author="study-agent",
        sections=(ReportSection(heading=safe_title, body=text, level=1),),
        citations=(),
    )
    destination = runtime.settings.export.output_dir / f"answer.{fmt}"
    try:
        if fmt == "docx":
            path = DocxExporter(runtime.settings.export).export(report, destination)
            media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            path = PdfExporter(runtime.settings.export).export(report, destination)
            media = "application/pdf"
    except ExportError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    data = path.read_bytes()
    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="answer.{fmt}"'},
    )


@app.post("/ask_stream")
async def ask_stream(
    chat_id: str = Form(...),
    question: str = Form(""),
    task_prompt: str = Form(""),
    execute_code: str = Form("0"),
    attachment: UploadFile | None = File(None),
) -> StreamingResponse:
    runtime = _require()
    payload: tuple[str, bytes] | None = None
    if attachment is not None and attachment.filename:
        payload = (Path(attachment.filename).name, await attachment.read())

    def generate() -> Iterator[str]:
        try:
            yield from _answer(
                runtime,
                chat_id=chat_id,
                question=question,
                task_prompt=task_prompt,
                execute_code=execute_code in {"1", "true", "yes"},
                upload=payload,
            )
        except Exception as exc:
            yield _line({"type": "error", "message": str(exc)})

    return StreamingResponse(generate(), media_type="application/x-ndjson")


def _answer(
    runtime: Runtime,
    *,
    chat_id: str,
    question: str,
    task_prompt: str,
    execute_code: bool,
    upload: tuple[str, bytes] | None,
) -> Iterator[str]:
    file_name = ""
    raw = b""
    if upload is not None:
        file_name, raw = upload
        suffix = Path(file_name).suffix.lower()
        if suffix not in _ALLOWED:
            yield _line({"type": "error", "message": "Вложение должно быть txt, md, pdf или docx"})
            return

    asked = question.strip()
    if not asked and not file_name:
        yield _line({"type": "error", "message": "Пустой вопрос"})
        return
    if not asked:
        asked = "Кратко разбери вложенный документ и выпиши тезисы с цитатами."

    with runtime.lock:
        if file_name:
            yield _line({"type": "stage", "text": f"Индексирую {file_name}"})
            library_dir = runtime.settings.rag.index_dir.parent / "library"
            library_dir.mkdir(parents=True, exist_ok=True)
            destination = library_dir / file_name
            destination.write_bytes(raw)
            document_id = stable_id(file_name)
            try:
                report = runtime.ingestor.ingest_path(destination, document_id)
            except (ParseError, EmbeddingError, ExtractionError, IndexError_, LLMError) as exc:
                yield _line({"type": "error", "message": f"Документ не проиндексирован: {exc}"})
                return
            catalog = runtime.catalog()
            catalog[document_id] = {"title": Path(file_name).stem, "filename": file_name}
            runtime.save_catalog(catalog)
            runtime.save_graph()
            yield _line(
                {"type": "stage", "text": f"Чанков: {report.chunk_count}, понятий: {report.concept_count}"}
            )

        yield _line({"type": "stage", "text": "Ищу фрагменты в библиотеке"})
        try:
            hits = runtime.retriever.search(asked)
        except (EmbeddingError, IndexError_, ValueError) as exc:
            yield _line({"type": "error", "message": str(exc)})
            return
        yield _line({"type": "stage", "text": f"Найдено фрагментов: {len(hits)}"})
        yield _line({"type": "stage", "text": "Собираю связанные понятия"})

        prior = list(runtime.history.get(chat_id, ()))
        prompt = _compose(asked, task_prompt, prior)
        try:
            answer = runtime.agent.answer(prompt, execute_code=execute_code)
        except (LLMError, SandboxPolicyError, ValueError) as exc:
            yield _line({"type": "error", "message": str(exc)})
            return

        text = answer.text
        if answer.citations:
            lines = [
                f"- {span.document_id} · {_page(span.page)} · {span.char_start}:{span.char_end}"
                for span in answer.citations
            ]
            text += "\n\n**Источники**\n" + "\n".join(lines)
        if answer.executed is not None:
            result = answer.executed
            mark = "таймаут" if result.timed_out else f"код {result.exit_code}"
            body = result.stdout or result.stderr
            text += f"\n\n**Песочница** ({mark})\n```\n{body}\n```"

        turns = runtime.history.setdefault(chat_id, deque(maxlen=_HISTORY_LIMIT))
        turns.append(("user", asked[:_TURN_CHARS]))
        turns.append(("assistant", text[:_TURN_CHARS]))

    for piece in _chunks(text):
        yield _line({"type": "chunk", "text": piece})
    yield _line({"type": "done", "answer": text, "files": []})


def _page(page: int | None) -> str:
    return f"стр. {page}" if page is not None else "без страницы"


def _compose(question: str, task_prompt: str, prior: list[tuple[str, str]]) -> str:
    parts: list[str] = []
    instruction = task_prompt.strip()
    if instruction:
        parts.append("Доп. инструкция:\n" + instruction)
    if prior:
        lines = [f"{role}: {content}" for role, content in prior]
        parts.append("Предыдущие реплики:\n" + "\n".join(lines))
    parts.append("Вопрос:\n" + question)
    return "\n\n".join(parts)


def _chunks(text: str, size: int = 48) -> list[str]:
    if text == "":
        return []
    return [text[index : index + size] for index in range(0, len(text), size)]
