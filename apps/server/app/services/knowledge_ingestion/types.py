from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field


ParsedBlockType = Literal["heading", "paragraph", "list_item", "table", "text"]


@dataclass(slots=True)
class ParsedBlock:
    block_type: ParsedBlockType
    text: str
    level: int | None = None
    heading_path: tuple[str, ...] = field(default_factory=tuple)

    def to_metadata(self) -> dict[str, object]:
        return {
            "type": self.block_type,
            "text": self.text,
            "level": self.level,
            "headingPath": list(self.heading_path),
        }

    @classmethod
    def from_metadata(cls, payload: dict[str, object]) -> "ParsedBlock":
        return cls(
            block_type=str(payload.get("type") or "text"),  # type: ignore[arg-type]
            text=str(payload.get("text") or "").strip(),
            level=int(payload["level"]) if payload.get("level") is not None else None,
            heading_path=tuple(str(item) for item in (payload.get("headingPath") or [])),
        )


@dataclass(slots=True)
class DocumentParseResult:
    blocks: list[ParsedBlock]
    parser_used: str


@dataclass(slots=True)
class RuntimeChunk:
    chunk_id: str
    source_type: str
    text: str
    current_heading: str | None = None
    parent_heading: str | None = None
    previous_text: str | None = None
    question_text: str | None = None
    answer_text: str | None = None


class GeneratedKnowledgeCard(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list, max_length=8)


class GeneratedKnowledgeCardBatch(BaseModel):
    cards: list[GeneratedKnowledgeCard] = Field(default_factory=list, max_length=10)


class ExtractedCardDraft(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list, max_length=5)
    source_chunk_id: str
    embedding: list[float] | None = None
    content_hash: str | None = None
