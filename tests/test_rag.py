"""RAG, ids, and extractor contract tests. No network."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from src.core.llm_client import CompletionResult
from src.knowledge.extractor import ConceptExtractor, ExtractionError
from src.knowledge.graph import KnowledgeGraph
from src.rag.chunker import Chunker
from src.rag.ingestor import DocumentIngestor
from src.rag.models import Chunk, ParsedDocument, SourceSpan, TextBlock
from src.rag.parsers import parser_for
from src.rag.store import FileVectorStore, IndexError_
from src.utils.ids import stable_id
from src.utils.text import normalize_ws


def test_stable_id_is_sha256_of_unit_separator() -> None:
    assert stable_id("a", "b") == hashlib.sha256(b"a\x1fb").hexdigest()
    with pytest.raises(ValueError):
        stable_id()


def test_normalize_ws_collapses_spaces_and_crlf() -> None:
    assert normalize_ws("a \t b\r\nc\rd") == "a b\nc\nd"


def test_plain_text_parser_keeps_utf8_and_no_page(tmp_path: Path) -> None:
    path = tmp_path / "note.txt"
    path.write_text("hello\nworld\n", encoding="utf-8")
    parsed = parser_for(path).parse(path, "doc-1")
    assert parsed.document_id == "doc-1"
    assert parsed.blocks[0].page is None
    assert "hello" in parsed.blocks[0].text
    assert parsed.blocks[0].char_end == len(parsed.blocks[0].text)


def test_markdown_parser_sets_section_from_atx_heading(tmp_path: Path) -> None:
    path = tmp_path / "note.md"
    path.write_text("# Title\n\nbody text\n", encoding="utf-8")
    parsed = parser_for(path).parse(path, "doc-1")
    body = next(block for block in parsed.blocks if block.text == "body text")
    assert body.section == "Title"
    assert body.page is None


def test_chunker_exact_window_and_zero_overlap() -> None:
    document = ParsedDocument(
        document_id="d",
        source_path="a.txt",
        media_type="text/plain",
        blocks=(TextBlock("abcdefghij", None, None, 0, 10),),
    )
    exact = Chunker(10, 0).split(document)
    assert [chunk.text for chunk in exact] == ["abcdefghij"]
    assert exact[0].embedding is None
    assert exact[0].chunk_id == stable_id("d", "0", "10")
    parts = Chunker(4, 0).split(document)
    assert [chunk.text for chunk in parts] == ["abcd", "efgh", "ij"]
    assert [chunk.metadata.char_start for chunk in parts] == [0, 4, 8]


def test_chunker_does_not_cross_pages() -> None:
    document = ParsedDocument(
        document_id="d",
        source_path="a.pdf",
        media_type="application/pdf",
        blocks=(
            TextBlock("abcd", 1, None, 0, 4),
            TextBlock("ef", 2, None, 0, 2),
        ),
    )
    chunks = Chunker(10, 0).split(document)
    assert [chunk.text for chunk in chunks] == ["abcd", "ef"]
    assert chunks[0].metadata.page == 1
    assert chunks[1].metadata.page == 2
    assert chunks[1].metadata.char_start == 5


def test_vector_store_upsert_search_and_zero_vector(tmp_path: Path) -> None:
    store = FileVectorStore(tmp_path / "index")
    first = _chunk("a", "alpha", (1.0, 0.0), 0, 5)
    second = _chunk("b", "beta", (0.0, 1.0), 0, 4)
    assert store.upsert([first, second]) == 2
    hits = store.search((1.0, 0.0), 1)
    assert [hit.chunk.chunk_id for hit in hits] == ["a"]
    assert hits[0].score == pytest.approx(1.0)
    assert store.search((0.0, 0.0), 2) == []
    with pytest.raises(IndexError_):
        store.search((1.0, 0.0), 0)
    replaced = _chunk("a", "alpha-2", (1.0, 0.0), 0, 7)
    store.upsert([replaced])
    again = store.search((1.0, 0.0), 2)
    assert again[0].chunk.text == "alpha-2"
    assert len(again) == 2


def test_reingest_replaces_chunks_without_duplicating(tmp_path: Path) -> None:
    path = tmp_path / "note.txt"
    path.write_text("alpha beta", encoding="utf-8")
    store = FileVectorStore(tmp_path / "index")
    graph = KnowledgeGraph()
    ingestor = DocumentIngestor(
        chunker=Chunker(100, 0),
        embeddings=_FakeEmbeddings(),
        store=store,
        extractor=ConceptExtractor(_FakeLLM("{}"), graph),
        graph=graph,
    )
    first = ingestor.ingest_path(path)
    path.write_text("gamma delta epsilon", encoding="utf-8")
    second = ingestor.ingest_path(path)
    hits = store.search((1.0, 0.0), 10)
    assert first.chunk_count == 1
    assert second.chunk_count == 1
    assert len(hits) == 1
    assert hits[0].chunk.text == "gamma delta epsilon"
    assert second.concept_count == 0


def test_extractor_bad_json_leaves_graph_unchanged() -> None:
    graph = KnowledgeGraph()
    extractor = ConceptExtractor(_FakeLLM("not-json"), graph)
    with pytest.raises(ExtractionError):
        extractor.extract([_chunk("c", "term", None, 0, 4)])
    assert graph.get("c") is None
    assert graph.snapshot().nodes == ()


class _FakeEmbeddings:
    def embed(self, texts: list[str]) -> list[tuple[float, ...]]:
        return [(1.0, 0.0) for _ in texts]


class _FakeLLM:
    def __init__(self, text: str) -> None:
        self._text = text

    def complete(self, request: object) -> CompletionResult:
        if self._text == "{}":
            payload = json.dumps({"concepts": [], "relations": []})
        else:
            payload = self._text
        return CompletionResult(
            text=payload,
            model="fake",
            prompt_tokens=0,
            completion_tokens=0,
            finish_reason="stop",
        )


def _chunk(
    chunk_id: str,
    text: str,
    embedding: tuple[float, ...] | None,
    start: int,
    end: int,
) -> Chunk:
    return Chunk(
        chunk_id=chunk_id,
        text=text,
        metadata=SourceSpan("doc", "note.txt", None, None, start, end),
        embedding=embedding,
    )
