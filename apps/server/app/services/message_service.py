from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import utc_now
from app.models.chat import Chat
from app.models.message import Message
from app.schemas.message import CitationRead, MessageCreate, MessageRead


class MessageService:
    @staticmethod
    def build_stream_url(*, chat_id: str, assistant_message_id: str) -> str:
        return f"/api/v1/chats/{chat_id}/messages/{assistant_message_id}/stream"

    @staticmethod
    def create_streaming_turn(
        db: Session,
        chat: Chat,
        payload: MessageCreate,
    ) -> tuple[Message, Message]:
        db.execute(select(Chat.id).where(Chat.id == chat.id).with_for_update())

        active_message = db.execute(
            select(Message).where(
                Message.chat_id == chat.id,
                Message.role == "assistant",
                Message.status == "streaming",
            )
        ).scalar_one_or_none()
        if active_message is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "CHAT_GENERATION_IN_PROGRESS",
                    "message": "当前会话正在生成回复。",
                    "activeMessage": {
                        "id": active_message.id,
                        "streamUrl": MessageService.build_stream_url(
                            chat_id=chat.id,
                            assistant_message_id=active_message.id,
                        ),
                    },
                },
            )

        user_created_at = utc_now()
        assistant_created_at = user_created_at + timedelta(microseconds=1)
        user_message = Message(
            id=str(uuid4()),
            chat_id=chat.id,
            role="user",
            status="done",
            created_at=user_created_at,
            updated_at=user_created_at,
            content=payload.content.strip(),
            message_metadata={
                "requestedUseKnowledge": payload.options.use_knowledge,
                "requestedUseWebSearch": payload.options.use_web_search,
            },
        )
        assistant_message = Message(
            id=str(uuid4()),
            chat_id=chat.id,
            role="assistant",
            status="streaming",
            created_at=assistant_created_at,
            updated_at=assistant_created_at,
            content="",
            message_metadata={
                "requestedUseKnowledge": payload.options.use_knowledge,
                "requestedUseWebSearch": payload.options.use_web_search,
            },
        )
        db.add(user_message)
        db.add(assistant_message)
        MessageService.touch_chat(db, chat)
        db.commit()
        db.refresh(user_message)
        db.refresh(assistant_message)
        return user_message, assistant_message

    @staticmethod
    def finalize_assistant_message(
        db: Session,
        assistant_message: Message,
        *,
        status: str,
        content: str,
        citations: list[CitationRead],
        model: str | None,
        used_knowledge: bool,
        used_web_search: bool,
        latency_ms: int | None,
        error_message: str | None,
    ) -> Message:
        metadata = dict(assistant_message.message_metadata or {})
        metadata.update(
            {
                "usedKnowledge": used_knowledge,
                "usedWebSearch": used_web_search,
                "latencyMs": latency_ms,
                "citations": [
                    citation.model_dump(by_alias=True, exclude_none=True) for citation in citations
                ],
            }
        )
        if model:
            metadata["model"] = model

        assistant_message.status = status
        assistant_message.content = content
        assistant_message.error_message = error_message
        assistant_message.model = model
        assistant_message.latency_ms = latency_ms
        assistant_message.message_metadata = metadata

        db.add(assistant_message)
        MessageService.touch_chat(db, assistant_message.chat)
        db.commit()
        db.refresh(assistant_message)
        return assistant_message

    @staticmethod
    def to_read(message: Message) -> MessageRead:
        stream_url = None
        if message.role == "assistant" and message.status == "streaming":
            stream_url = MessageService.build_stream_url(
                chat_id=message.chat_id,
                assistant_message_id=message.id,
            )
        return MessageRead(
            id=message.id,
            chat_id=message.chat_id,
            role=message.role,
            status=message.status,
            content=message.content,
            error_message=message.error_message,
            metadata=message.message_metadata,
            stream_url=stream_url,
            created_at=message.created_at,
        )

    @staticmethod
    def touch_chat(db: Session, chat: Chat) -> None:
        chat.updated_at = utc_now()
        db.add(chat)

    @staticmethod
    def list_chat_messages(chat: Chat) -> list[MessageRead]:
        return [
            MessageService.to_read(message)
            for message in sorted(chat.messages, key=lambda item: (item.created_at, item.id))
        ]

    @staticmethod
    def get_message_by_id(db: Session, message_id: str) -> Message | None:
        return db.get(Message, message_id)

    @staticmethod
    def get_chat_message_or_none(db: Session, chat_id: str, message_id: str) -> Message | None:
        return db.execute(
            select(Message).where(
                Message.id == message_id,
                Message.chat_id == chat_id,
            )
        ).scalar_one_or_none()
