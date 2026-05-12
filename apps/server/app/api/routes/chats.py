from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.chat import ChatCreate, ChatDetailResponse, ChatListResponse, ChatRead
from app.schemas.message import MessageCreate, MessageCreateResponse
from app.services.chat_service import ChatService
from app.services.message_service import MessageService

router = APIRouter(prefix="/chats", tags=["chats"])


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


@router.get("/{chat_id}", response_model=ChatDetailResponse)
def get_chat(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatDetailResponse:
    chat = ChatService.get_or_none(db, current_user, chat_id)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    return ChatService.detail(chat)


@router.post("/{chat_id}/messages", response_model=MessageCreateResponse)
def create_message(
    chat_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageCreateResponse:
    chat = ChatService.get_or_none(db, current_user, chat_id)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    return MessageService.create(db, current_user, chat, payload)


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
