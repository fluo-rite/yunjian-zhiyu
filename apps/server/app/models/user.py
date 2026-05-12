from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(20), default="local")
    hashed_password: Mapped[str] = mapped_column(String(255))

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    cards = relationship("KnowledgeCard", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
