from __future__ import annotations

from dataclasses import dataclass
import json

from app.agents.chat_agent.agent import ChatAgentRawEvent
from app.schemas.message import CitationRead, MessageRead
from app.schemas.stream import (
    AgentStreamEvent,
    ErrorEventData,
    MessageAbortedEventData,
    MessageDeltaEventData,
    MessageDoneEventData,
    MessageStartEventData,
)
from app.services.stream_store_service import StreamRecord


@dataclass(slots=True)
class AggregatedStreamResult:
    content: str
    citations: list[CitationRead]
    terminal_event: str | None
    error_message: str | None
    used_knowledge: bool
    used_web_search: bool


class StreamAdapterService:
    @staticmethod
    def build_start_event(*, chat_id: str, assistant_message_id: str) -> AgentStreamEvent:
        return AgentStreamEvent(
            event="message.start",
            data=MessageStartEventData(
                message_id=assistant_message_id,
                chat_id=chat_id,
            ).model_dump(mode="json", by_alias=True),
        )

    @staticmethod
    def build_delta_event(*, assistant_message_id: str, delta: str) -> AgentStreamEvent:
        return AgentStreamEvent(
            event="message.delta",
            data=MessageDeltaEventData(
                message_id=assistant_message_id,
                delta=delta,
            ).model_dump(mode="json", by_alias=True),
        )

    @staticmethod
    def adapt_graph_chunk(
        *,
        chat_id: str,
        assistant_message_id: str,
        event: ChatAgentRawEvent,
    ) -> AgentStreamEvent | None:
        if event["type"] == "message_delta":
            return StreamAdapterService.build_delta_event(
                assistant_message_id=assistant_message_id,
                delta=event["delta"],
            )

        return None

    @staticmethod
    def build_done_event(
        *,
        message: MessageRead,
        citations: list[CitationRead],
    ) -> AgentStreamEvent:
        return AgentStreamEvent(
            event="message.done",
            data=MessageDoneEventData(message=message, citations=citations).model_dump(
                mode="json",
                by_alias=True,
            ),
        )

    @staticmethod
    def build_aborted_event(*, message: MessageRead) -> AgentStreamEvent:
        return AgentStreamEvent(
            event="message.aborted",
            data=MessageAbortedEventData(message=message).model_dump(
                mode="json",
                by_alias=True,
            ),
        )

    @staticmethod
    def build_error_event(
        *,
        chat_id: str,
        message: str,
        assistant_message_id: str | None = None,
        final_message: MessageRead | None = None,
    ) -> AgentStreamEvent:
        return AgentStreamEvent(
            event="error",
            data=ErrorEventData(
                message=message,
                chat_id=chat_id,
                message_id=assistant_message_id,
                final_message=final_message,
            ).model_dump(mode="json", by_alias=True, exclude_none=True),
        )

    @staticmethod
    def to_redis_record(event: AgentStreamEvent) -> dict[str, str]:
        return {
            "event": event.event,
            "data": json.dumps(event.data, ensure_ascii=False),
        }

    @staticmethod
    def to_sse(event: AgentStreamEvent, *, event_id: str | None = None) -> dict[str, str]:
        payload = StreamAdapterService.to_redis_record(event)
        if event_id is not None:
            payload["id"] = event_id
        return payload

    @staticmethod
    def redis_record_to_sse(record: StreamRecord) -> dict[str, str]:
        return {
            "id": record.id,
            "event": record.event,
            "data": record.data,
        }

    @staticmethod
    def aggregate_stream_events(records: list[StreamRecord]) -> AggregatedStreamResult:
        content_parts: list[str] = []
        citations: list[CitationRead] = []
        terminal_event: str | None = None
        error_message: str | None = None
        used_knowledge = False
        used_web_search = False

        for record in records:
            payload = json.loads(record.data)
            if record.event == "message.delta":
                delta = payload.get("delta")
                if isinstance(delta, str):
                    content_parts.append(delta)
            elif record.event == "message.done":
                terminal_event = record.event
                citations = [
                    CitationRead.model_validate(item)
                    for item in payload.get("citations", [])
                    if isinstance(item, dict)
                ]
                message_payload = payload.get("message", {})
                metadata = message_payload.get("metadata", {})
                used_knowledge = bool(metadata.get("usedKnowledge"))
                used_web_search = bool(metadata.get("usedWebSearch"))
            elif record.event == "error":
                terminal_event = record.event
                error = payload.get("message")
                if isinstance(error, str):
                    error_message = error
                final_message = payload.get("finalMessage", {})
                metadata = final_message.get("metadata", {})
                used_knowledge = bool(metadata.get("usedKnowledge"))
                used_web_search = bool(metadata.get("usedWebSearch"))
            elif record.event == "message.aborted":
                terminal_event = record.event
                message_payload = payload.get("message", {})
                metadata = message_payload.get("metadata", {})
                used_knowledge = bool(metadata.get("usedKnowledge"))
                used_web_search = bool(metadata.get("usedWebSearch"))

        return AggregatedStreamResult(
            content="".join(content_parts).strip(),
            citations=citations,
            terminal_event=terminal_event,
            error_message=error_message,
            used_knowledge=used_knowledge,
            used_web_search=used_web_search,
        )
