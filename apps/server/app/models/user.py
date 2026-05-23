from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "auth_provider IN ('local', 'oauth')",
            name="ck_users_auth_provider",
        ),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(20), default="local")
    hashed_password: Mapped[str] = mapped_column(String(255))

    chats = relationship("Chat", back_populates="user", passive_deletes="all")
    cards = relationship("KnowledgeCard", back_populates="user", passive_deletes="all")
    knowledge_sources = relationship(
        "KnowledgeSource",
        back_populates="user",
        passive_deletes="all",
    )
    card_groups = relationship("CardGroup", back_populates="user", passive_deletes="all")
