from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import CamelModel

MessageStatus = Literal["streaming", "done", "failed", "aborted"]


class MessageRead(CamelModel):
    id: str
    chat_id: str
    role: Literal["user", "assistant"]
    status: MessageStatus
    content: str
    error_message: str | None = None
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


class CreateChatMessageResponse(CamelModel):
    user_message_id: str
    assistant_message_id: str


class ChatMessageListResponse(CamelModel):
    items: list[MessageRead]


class AbortChatMessageResponse(CamelModel):
    assistant_message_id: str
    status: Literal["aborting"]


class ActiveMessageInfo(CamelModel):
    id: str


class ChatGenerationConflictResponse(CamelModel):
    code: Literal["CHAT_GENERATION_IN_PROGRESS"] = "CHAT_GENERATION_IN_PROGRESS"
    message: str
    active_message: ActiveMessageInfo
