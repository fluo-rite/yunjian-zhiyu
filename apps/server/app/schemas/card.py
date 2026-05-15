from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel, PaginationMeta

CardType = Literal["concept", "method", "summary", "example", "correction"]
CardStatus = Literal["draft", "active", "archived"]
CardSourceType = Literal["manual", "document", "chat", "ai"]


class CardCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = None
    content: str = Field(min_length=1)
    card_type: CardType
    tags: list[str] = Field(default_factory=list)
    status: CardStatus = "active"
    source_type: CardSourceType = "manual"


class CardUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = None
    content: str | None = Field(default=None, min_length=1)
    card_type: CardType | None = None
    tags: list[str] | None = None
    status: CardStatus | None = None


class CardRead(CamelModel):
    id: str
    title: str
    summary: str | None = None
    content: str
    card_type: CardType
    tags: list[str]
    status: CardStatus
    source_type: CardSourceType
    created_at: datetime
    updated_at: datetime


class CardListResponse(CamelModel):
    items: list[CardRead]
    pagination: PaginationMeta


class BatchConfirmCardsRequest(CamelModel):
    card_ids: list[str] = Field(min_length=1)


class BatchConfirmCardsResponse(CamelModel):
    updated_count: int
