from __future__ import annotations

import re
from collections import Counter

from app.services.knowledge_ingestion.types import ParsedBlock


class ContentCleanService:
    def clean_document_blocks(self, blocks: list[ParsedBlock]) -> list[ParsedBlock]:
        normalized_blocks: list[ParsedBlock] = []
        text_counter = Counter(self._normalize_inline_space(block.text) for block in blocks if block.text.strip())

        for block in blocks:
            cleaned_text = self._normalize_inline_space(block.text)
            if not cleaned_text:
                continue
            if self._looks_like_page_noise(cleaned_text):
                continue
            if text_counter[cleaned_text] >= 3 and len(cleaned_text) <= 40:
                continue
            normalized_blocks.append(
                ParsedBlock(
                    block_type=block.block_type,
                    text=cleaned_text,
                    level=block.level,
                    heading_path=block.heading_path,
                )
            )
        return normalized_blocks

    @staticmethod
    def clean_manual_text(text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized = "\n".join(line.rstrip() for line in normalized.splitlines())
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        return normalized.strip()

    @staticmethod
    def _normalize_inline_space(text: str) -> str:
        compact = text.replace("\u3000", " ").strip()
        compact = re.sub(r"[ \t]+", " ", compact)
        compact = re.sub(r"\n{3,}", "\n\n", compact)
        return compact.strip()

    @staticmethod
    def _looks_like_page_noise(text: str) -> bool:
        stripped = text.strip()
        if re.fullmatch(r"\d{1,4}", stripped):
            return True
        if re.fullmatch(r"(page|页)\s*\d{1,4}", stripped, flags=re.IGNORECASE):
            return True
        return False


_service: ContentCleanService | None = None


def get_content_clean_service() -> ContentCleanService:
    global _service
    if _service is None:
        _service = ContentCleanService()
    return _service
