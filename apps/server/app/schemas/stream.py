from typing import Any, Literal

from app.schemas.common import CamelModel
from app.schemas.message import MessageRead


StatusPhase = Literal["retrieving_knowledge", "searching_web", "assembling_answer"]


AgentStreamEventType = Literal[
    "status",
    "message.start",
    "message.delta",
    "message.done",
    "error",
    "message.aborted",
]


class StatusEventData(CamelModel):
    phase: StatusPhase
    label: str


class MessageStartEventData(CamelModel):
    message_id: str
    chat_id: str
    role: Literal["assistant"] = "assistant"


class MessageDeltaEventData(CamelModel):
    message_id: str
    delta: str


class MessageDoneEventData(CamelModel):
    message: MessageRead


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
