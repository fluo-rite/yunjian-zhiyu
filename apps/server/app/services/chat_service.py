from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.chat import Chat
from app.models.user import User
from app.schemas.chat import ChatCreate, ChatListResponse, ChatRead
from app.schemas.common import PaginationMeta


class ChatService:
    @staticmethod
    def create(db: Session, user: User, payload: ChatCreate) -> ChatRead:
        chat = Chat(user_id=user.id, title=payload.title)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        return ChatRead.model_validate(chat)

    @staticmethod
    def list(db: Session, user: User, *, page: int, page_size: int) -> ChatListResponse:
        statement = select(Chat).where(Chat.user_id == user.id)
        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
        chats = (
            db.execute(
                statement.order_by(Chat.updated_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            .scalars()
            .all()
        )
        return ChatListResponse(
            items=[ChatRead.model_validate(chat) for chat in chats],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                has_more=page * page_size < total,
            ),
        )

    @staticmethod
    def get_or_none(db: Session, user: User, chat_id: str) -> Chat | None:
        return db.execute(
            select(Chat)
            .options(selectinload(Chat.messages))
            .where(Chat.id == chat_id, Chat.user_id == user.id)
        ).scalar_one_or_none()

    @staticmethod
    def delete(db: Session, chat: Chat) -> None:
        db.delete(chat)
        db.commit()
