from typing import Any, Literal

from app.schemas.common import CamelModel
from app.schemas.message import CitationRead, MessageRead


AgentStreamEventType = Literal["message.start", "message.delta", "message.done", "error", "message.aborted"]


class MessageStartEventData(CamelModel):
    message_id: str
    chat_id: str
    role: Literal["assistant"] = "assistant"


class MessageDeltaEventData(CamelModel):
    message_id: str
    delta: str


class MessageDoneEventData(CamelModel):
    message: MessageRead
    citations: list[CitationRead]


class MessageAbortedEventData(CamelModel):
    message: MessageRead


class ErrorEventData(CamelModel):
    message: str
    chat_id: str
    message_id: str | None = None
    final_message: MessageRead | None = None


class AgentStreamEvent(CamelModel):
    event: AgentStreamEventType
    data: dict[str, Any]
