from __future__ import annotations

from itertools import count
import re

from app.models.knowledge_source import KnowledgeSource
from app.services.knowledge_ingestion.types import ParsedBlock, RuntimeChunk

MAX_CHARS = 1000


class ChunkBuildService:
    def build_chunks(
        self,
        *,
        source: KnowledgeSource,
        document_blocks: list[ParsedBlock] | None = None,
        manual_text: str | None = None,
    ) -> list[RuntimeChunk]:
        if source.source_type == "messages":
            return self._build_message_chunks(source)
        if source.source_type == "document":
            return self._build_document_like_chunks("document", document_blocks or [])
        return self._build_manual_text_chunks(manual_text or source.raw_content)

    def _build_document_like_chunks(self, source_type: str, blocks: list[ParsedBlock]) -> list[RuntimeChunk]:
        chunk_counter = count(1)
        chunks: list[RuntimeChunk] = []
        buffer_parts: list[str] = []
        buffer_heading_path: tuple[str, ...] = ()

        def flush_buffer() -> None:
            nonlocal buffer_parts, buffer_heading_path
            text = "\n\n".join(part for part in buffer_parts if part.strip()).strip()
            if text:
                chunks.append(
                    RuntimeChunk(
                        chunk_id=f"chunk-{next(chunk_counter)}",
                        source_type=source_type,
                        text=text,
                        current_heading=buffer_heading_path[-1] if buffer_heading_path else None,
                        parent_heading=buffer_heading_path[-2] if len(buffer_heading_path) > 1 else None,
                    )
                )
            buffer_parts = []
            buffer_heading_path = ()

        for block in blocks:
            if block.block_type == "heading":
                flush_buffer()
                continue

            segments = self._split_block_to_segments(block.text, block.block_type)
            for segment in segments:
                if not segment:
                    continue
                if not buffer_parts:
                    buffer_heading_path = block.heading_path
                    buffer_parts = [segment]
                    continue

                same_heading = block.heading_path == buffer_heading_path
                candidate_text = "\n\n".join(buffer_parts + [segment])
                if same_heading and len(candidate_text) <= MAX_CHARS:
                    buffer_parts.append(segment)
                else:
                    flush_buffer()
                    buffer_heading_path = block.heading_path
                    buffer_parts = [segment]

        flush_buffer()
        self._attach_previous_context(chunks)
        return chunks

    def _build_manual_text_chunks(self, text: str) -> list[RuntimeChunk]:
        blocks = self._manual_text_to_blocks(text)
        chunks = self._build_document_like_chunks("manual_text", blocks)
        return chunks

    def _build_message_chunks(self, source: KnowledgeSource) -> list[RuntimeChunk]:
        metadata = source.source_metadata or {}
        snapshots = metadata.get("messages")
        if not isinstance(snapshots, list):
            return []

        chunk_counter = count(1)
        chunks: list[RuntimeChunk] = []
        pending_users: list[str] = []
        pending_assistants: list[str] = []

        def flush_pair() -> None:
            nonlocal pending_users, pending_assistants
            question_text = "\n".join(item.strip() for item in pending_users if item.strip()).strip()
            answer_text = "\n".join(item.strip() for item in pending_assistants if item.strip()).strip()
            if not question_text and not answer_text:
                pending_users = []
                pending_assistants = []
                return
            text_parts = []
            if question_text:
                text_parts.append(f"问：{question_text}")
            if answer_text:
                text_parts.append(f"答：{answer_text}")
            chunks.append(
                RuntimeChunk(
                    chunk_id=f"chunk-{next(chunk_counter)}",
                    source_type="messages",
                    text="\n".join(text_parts).strip(),
                    question_text=question_text or None,
                    answer_text=answer_text or None,
                )
            )
            pending_users = []
            pending_assistants = []

        for item in snapshots:
            if not isinstance(item, dict):
                continue
            role = str(item.get("role") or "").strip()
            content = str(item.get("content") or "").strip()
            if not content:
                continue

            if role == "user":
                if pending_assistants:
                    flush_pair()
                pending_users.append(content)
            elif role == "assistant":
                if not pending_users and pending_assistants:
                    pending_assistants.append(content)
                else:
                    pending_assistants.append(content)
            else:
                continue

        flush_pair()
        self._attach_previous_context(chunks)
        return chunks

    def _attach_previous_context(self, chunks: list[RuntimeChunk]) -> None:
        for index, chunk in enumerate(chunks):
            if index == 0:
                continue
            if not self._needs_previous_context(chunk):
                continue
            chunks[index].previous_text = chunks[index - 1].text[-400:]

    @staticmethod
    def _needs_previous_context(chunk: RuntimeChunk) -> bool:
        target_text = chunk.answer_text or chunk.text
        if len(target_text) < 120:
            return True
        return bool(re.search(r"(它|这样|前者|后者|该方法|这种方式|其\b)", target_text))

    def _manual_text_to_blocks(self, text: str) -> list[ParsedBlock]:
        blocks: list[ParsedBlock] = []
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        for raw_block in re.split(r"\n\s*\n+", normalized):
            block = raw_block.strip()
            if not block:
                continue
            lines = [line.strip() for line in block.splitlines() if line.strip()]
            if lines and all(self._looks_like_list_item(line) for line in lines):
                for line in lines:
                    blocks.append(ParsedBlock(block_type="list_item", text=line))
            else:
                blocks.append(ParsedBlock(block_type="paragraph", text=block))
        return blocks

    def _split_block_to_segments(self, text: str, block_type: str) -> list[str]:
        normalized = text.strip()
        if len(normalized) <= MAX_CHARS:
            return [normalized]

        if block_type in {"paragraph", "text"}:
            for splitter in (self._split_by_lines, self._split_by_sentences):
                pieces = splitter(normalized)
                if len(pieces) > 1:
                    return self._pack_pieces(pieces)

        if block_type in {"list_item", "table"}:
            pieces = self._split_by_sentences(normalized)
            if len(pieces) > 1:
                return self._pack_pieces(pieces)

        return self._hard_cut(normalized)

    @staticmethod
    def _split_by_lines(text: str) -> list[str]:
        return [line.strip() for line in text.splitlines() if line.strip()]

    @staticmethod
    def _split_by_sentences(text: str) -> list[str]:
        segments = re.split(r"(?<=[。！？!?；;])", text)
        return [segment.strip() for segment in segments if segment.strip()]

    def _pack_pieces(self, pieces: list[str]) -> list[str]:
        packed: list[str] = []
        buffer = ""
        for piece in pieces:
            candidate = piece if not buffer else f"{buffer}\n{piece}"
            if len(candidate) <= MAX_CHARS:
                buffer = candidate
            else:
                if buffer:
                    packed.append(buffer.strip())
                if len(piece) <= MAX_CHARS:
                    buffer = piece
                else:
                    packed.extend(self._hard_cut(piece))
                    buffer = ""
        if buffer:
            packed.append(buffer.strip())
        return packed

    @staticmethod
    def _hard_cut(text: str) -> list[str]:
        return [text[index : index + MAX_CHARS].strip() for index in range(0, len(text), MAX_CHARS)]

    @staticmethod
    def _looks_like_list_item(line: str) -> bool:
        return bool(re.match(r"^([-*•]|\d+[.)、])\s*", line))


_service: ChunkBuildService | None = None


def get_chunk_build_service() -> ChunkBuildService:
    global _service
    if _service is None:
        _service = ChunkBuildService()
    return _service
