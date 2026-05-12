from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import CamelModel


class MessageRead(CamelModel):
    id: str
    chat_id: str
    role: str
    content: str
    metadata: dict[str, Any] | None = None
    created_at: datetime


class MessageOptions(CamelModel):
    use_knowledge: bool = True
    use_web_search: bool = False


class MessageCreate(CamelModel):
    content: str = Field(min_length=1)
    options: MessageOptions = Field(default_factory=MessageOptions)


class CitationRead(CamelModel):
    type: Literal["knowledge_card", "web"]
    title: str
    snippet: str
    source_id: str | None = None
    url: str | None = None


class MessageCreateResponse(CamelModel):
    message: MessageRead
    citations: list[CitationRead]
