from datetime import datetime

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.card import CardRead


class CreateCardGroupRequest(CamelModel):
    name: str = Field(min_length=1, max_length=100)


class UpdateCardGroupRequest(CamelModel):
    name: str = Field(min_length=1, max_length=100)


class CardGroupRead(CamelModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime


class CardGroupListResponse(CamelModel):
    items: list[CardGroupRead]


class AddCardToGroupRequest(CamelModel):
    card_id: str


class CardGroupCardsResponse(CamelModel):
    items: list[CardRead]
