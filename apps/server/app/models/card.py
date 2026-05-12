from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class KnowledgeCard(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_cards"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    card_type: Mapped[str] = mapped_column(String(30))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), index=True, default="active")
    source_type: Mapped[str] = mapped_column(String(20), default="manual")

    user = relationship("User", back_populates="cards")
