from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.card import CardRead, SourceType
from app.schemas.common import CamelModel, PaginationMeta

KnowledgeSourceStatus = Literal["processing", "ready", "failed"]


class CreateKnowledgeSourceFromTextRequest(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class CreateKnowledgeSourceFromMessagesRequest(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    messages: list[str] = Field(min_length=1)


class KnowledgeSourceRead(CamelModel):
    id: str
    name: str
    source_type: SourceType
    status: KnowledgeSourceStatus
    created_at: datetime
    updated_at: datetime


class KnowledgeSourceListResponse(CamelModel):
    items: list[KnowledgeSourceRead]
    pagination: PaginationMeta


class KnowledgeSourceDetailRead(KnowledgeSourceRead):
    raw_content: str
    source_metadata: dict | None = None


class KnowledgeSourceCardsResponse(CamelModel):
    items: list[CardRead]


class LinkedCardPreview(CamelModel):
    id: str
    title: str
    status: Literal["pending", "active", "archived"]


class KnowledgeSourceDeletePreviewResponse(CamelModel):
    source: KnowledgeSourceRead
    linked_cards: list[LinkedCardPreview]


class DeleteKnowledgeSourceRequest(CamelModel):
    delete_cards: bool
