from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sse_starlette import EventSourceResponse

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.chat import ChatCreate, ChatListResponse, ChatRead
from app.schemas.message import (
    AbortChatMessageResponse,
    ChatMessageListResponse,
    CreateChatMessageResponse,
    MessageCreate,
)
from app.services.chat_service import ChatService
from app.services.chat_generation_service import ChatGenerationJob, get_chat_task_dispatcher
from app.services.message_service import MessageService
from app.services.stream_adapter_service import StreamAdapterService
from app.services.stream_store_service import (
    TERMINAL_STREAM_EVENTS,
    build_abort_key,
    build_stream_key,
    get_stream_store,
)

router = APIRouter(prefix="/chats", tags=["chats"])


def _normalize_last_event_id(value: str | None) -> str:
    normalized = (value or "").strip()
    if not normalized:
        return "0-0"
    return normalized


@router.post("", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
def create_chat(
    payload: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatRead:
    return ChatService.create(db, current_user, payload)


@router.get("", response_model=ChatListResponse)
def list_chats(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatListResponse:
    return ChatService.list(db, current_user, page=page, page_size=page_size)

def _build_stream_response(
    *,
    db: Session,
    chat_id: str,
    assistant_message_id: str,
    current_user: User,
    last_event_id: str,
) -> EventSourceResponse:
    chat = ChatService.get_or_none(db, current_user, chat_id)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    assistant_message = MessageService.get_chat_message_or_none(db, chat.id, assistant_message_id)
    if assistant_message is None or assistant_message.role != "assistant":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    stream_key = build_stream_key(chat.id, assistant_message.id)
    stream_store = get_stream_store()

    async def event_generator():
        cursor = last_event_id
        while True:
            records = await stream_store.read_after_blocking(stream_key, cursor, block_ms=500)
            if records:
                for record in records:
                    cursor = record.id
                    yield StreamAdapterService.redis_record_to_sse(record)
                    if record.event in TERMINAL_STREAM_EVENTS:
                        return

    return EventSourceResponse(event_generator())


@router.post("/{chat_id}/messages", response_model=CreateChatMessageResponse)
async def create_chat_message(
    chat_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreateChatMessageResponse:
    chat = ChatService.get_or_none(db, current_user, chat_id)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    user_message, assistant_message = MessageService.create_streaming_turn(db, chat, payload)
    await get_chat_task_dispatcher().enqueue_generation(
        ChatGenerationJob(
            chat_id=chat.id,
            user_id=current_user.id,
            user_message_id=user_message.id,
            assistant_message_id=assistant_message.id,
            use_knowledge=payload.options.use_knowledge,
            use_web_search=payload.options.use_web_search,
        )
    )
    return CreateChatMessageResponse(
        user_message_id=user_message.id,
        assistant_message_id=assistant_message.id,
    )


@router.get("/{chat_id}/messages", response_model=ChatMessageListResponse)
def list_chat_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatMessageListResponse:
    chat = ChatService.get_or_none(db, current_user, chat_id)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    return ChatMessageListResponse(items=MessageService.list_chat_messages(chat))


@router.get("/{chat_id}/messages/{assistant_message_id}/stream")
async def stream_chat_message(
    chat_id: str,
    assistant_message_id: str,
    last_event_id: str = Query(default="0-0", alias="lastEventId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventSourceResponse:
    return _build_stream_response(
        db=db,
        chat_id=chat_id,
        assistant_message_id=assistant_message_id,
        current_user=current_user,
        last_event_id=_normalize_last_event_id(last_event_id),
    )


@router.post("/{chat_id}/messages/{assistant_message_id}/abort", response_model=AbortChatMessageResponse)
async def abort_chat_message(
    chat_id: str,
    assistant_message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AbortChatMessageResponse:
    chat = ChatService.get_or_none(db, current_user, chat_id)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    assistant_message = MessageService.get_chat_message_or_none(db, chat.id, assistant_message_id)
    if assistant_message is None or assistant_message.role != "assistant":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")
    if assistant_message.status != "streaming":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only streaming assistant messages can be aborted.",
        )

    await get_stream_store().set_abort_flag(build_abort_key(chat.id, assistant_message.id))
    return AbortChatMessageResponse(
        assistant_message_id=assistant_message.id,
        status="aborting",
    )

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    chat = ChatService.get_or_none(db, current_user, chat_id)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    ChatService.delete(db, chat)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
