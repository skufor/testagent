"""Retrieval pipeline and metadata-bearing chunks."""

from src.rag.chunker import Chunker
from src.rag.embeddings import EmbeddingClient, EmbeddingError, OpenAICompatibleEmbeddings
from src.rag.ingestor import DocumentIngestor
from src.rag.models import Chunk, IngestReport, ParsedDocument, RetrievedChunk, SourceSpan, TextBlock
from src.rag.parsers import DocxParser, DocumentParser, ParseError, PdfParser, PlainTextParser, parser_for
from src.rag.retriever import Retriever
from src.rag.store import FileVectorStore, IndexError_, VectorStore

__all__ = [
    "Chunk",
    "Chunker",
    "DocxParser",
    "DocumentIngestor",
    "DocumentParser",
    "EmbeddingClient",
    "EmbeddingError",
    "FileVectorStore",
    "IndexError_",
    "IngestReport",
    "OpenAICompatibleEmbeddings",
    "ParseError",
    "ParsedDocument",
    "PdfParser",
    "PlainTextParser",
    "RetrievedChunk",
    "Retriever",
    "SourceSpan",
    "TextBlock",
    "VectorStore",
    "parser_for",
]
