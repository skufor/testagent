"""Character-window chunker. Does not call the network."""

from __future__ import annotations

from src.rag.models import Chunk, ParsedDocument, SourceSpan, TextBlock
from src.utils.ids import stable_id


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
        if self._chunk_size < 1:
            raise ValueError("chunk_size must be >= 1")
        if self._chunk_overlap < 0 or self._chunk_overlap >= self._chunk_size:
            raise ValueError("chunk_overlap must be >= 0 and < chunk_size")
        groups = _page_groups(document.blocks)
        if not groups:
            return []
        chunks: list[Chunk] = []
        cursor = 0
        for index, group in enumerate(groups):
            if index:
                cursor += 1
            segment = "\n".join(block.text for block in group)
            if segment == "":
                continue
            base = cursor
            chunks.extend(self._windows(document, group, segment, base))
            cursor += len(segment)
        return chunks

    def _windows(
        self,
        document: ParsedDocument,
        group: list[TextBlock],
        segment: str,
        base: int,
    ) -> list[Chunk]:
        step = self._chunk_size - self._chunk_overlap
        chunks: list[Chunk] = []
        start = 0
        length = len(segment)
        while start < length:
            end = min(start + self._chunk_size, length)
            char_start = base + start
            char_end = base + end
            block = _block_at(group, start)
            metadata = SourceSpan(
                document_id=document.document_id,
                source_path=document.source_path,
                page=block.page,
                section=block.section,
                char_start=char_start,
                char_end=char_end,
            )
            chunks.append(
                Chunk(
                    chunk_id=stable_id(document.document_id, str(char_start), str(char_end)),
                    text=segment[start:end],
                    metadata=metadata,
                    embedding=None,
                )
            )
            if end == length:
                break
            start += step
        return chunks


def _page_groups(blocks: tuple[TextBlock, ...]) -> list[list[TextBlock]]:
    groups: list[list[TextBlock]] = []
    for block in blocks:
        if block.text == "":
            continue
        if not groups or groups[-1][0].page != block.page:
            groups.append([block])
        else:
            groups[-1].append(block)
    return groups


def _block_at(group: list[TextBlock], local_start: int) -> TextBlock:
    cursor = 0
    chosen = group[0]
    for index, block in enumerate(group):
        if index:
            cursor += 1
        next_cursor = cursor + len(block.text)
        if cursor <= local_start < next_cursor:
            return block
        chosen = block
        cursor = next_cursor
    return chosen
