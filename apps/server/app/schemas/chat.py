from datetime import datetime

from pydantic import Field

from app.schemas.common import CamelModel, PaginationMeta
from app.schemas.message import MessageRead


class ChatCreate(CamelModel):
    title: str = Field(min_length=1, max_length=100)


class ChatRead(CamelModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatListResponse(CamelModel):
    items: list[ChatRead]
    pagination: PaginationMeta


class ChatDetailResponse(CamelModel):
    chat: ChatRead
    messages: list[MessageRead]
