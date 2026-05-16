from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel, PaginationMeta

CardStatus = Literal["pending", "active", "archived"]
SourceType = Literal["manual_text", "document", "messages"]


class CardRead(CamelModel):
    id: str
    title: str
    content: str
    tags: list[str]
    status: CardStatus
    source_type: SourceType
    source_id: str | None = None
    created_at: datetime
    updated_at: datetime


class CardListResponse(CamelModel):
    items: list[CardRead]
    pagination: PaginationMeta


class ConfirmCardResponse(CardRead):
    pass


class ConfirmCardsRequest(CamelModel):
    card_ids: list[str] = Field(min_length=1, max_length=100)


class ConfirmCardsResponse(CamelModel):
    items: list[ConfirmCardResponse]


class ArchiveCardResponse(CardRead):
    pass
