"""Character-window chunker. Does not call the network."""

from __future__ import annotations

from src.rag.models import Chunk, ParsedDocument


class Chunker:
    def __init__(self, chunk_size: int, chunk_overlap: int) -> None:
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

    def split(self, document: ParsedDocument) -> list[Chunk]:
        """Split ``document`` into chunks of at most ``chunk_size`` characters.

        Overlap is ``chunk_overlap`` characters. A chunk never crosses a page
        boundary. ``metadata.char_start/char_end`` cover the chunk's span in the
        concatenated normalized text. ``embedding`` is ``None``.
        ``chunk_id`` is ``stable_id(document_id, str(char_start), str(char_end))``.
        """
        pass
