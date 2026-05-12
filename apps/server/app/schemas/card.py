from datetime import datetime

from pydantic import Field

from app.schemas.common import CamelModel, PaginationMeta


class CardCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = None
    content: str = Field(min_length=1)
    card_type: str
    tags: list[str] = Field(default_factory=list)
    status: str = "active"
    source_type: str = "manual"


class CardUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = None
    content: str | None = Field(default=None, min_length=1)
    card_type: str | None = None
    tags: list[str] | None = None
    status: str | None = None


class CardRead(CamelModel):
    id: str
    title: str
    summary: str | None = None
    content: str
    card_type: str
    tags: list[str]
    status: str
    source_type: str
    created_at: datetime
    updated_at: datetime


class CardListResponse(CamelModel):
    items: list[CardRead]
    pagination: PaginationMeta


class BatchConfirmCardsRequest(CamelModel):
    card_ids: list[str] = Field(min_length=1)


class BatchConfirmCardsResponse(CamelModel):
    updated_count: int
