from sqlalchemy import CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class KnowledgeCard(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_cards"
    __table_args__ = (
        CheckConstraint(
            "card_type IN ('concept', 'method', 'summary', 'example', 'correction')",
            name="ck_knowledge_cards_card_type",
        ),
        CheckConstraint(
            "status IN ('draft', 'active', 'archived')",
            name="ck_knowledge_cards_status",
        ),
        CheckConstraint(
            "source_type IN ('manual', 'document', 'chat', 'ai')",
            name="ck_knowledge_cards_source_type",
        ),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    card_type: Mapped[str] = mapped_column(String(30))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), index=True, default="active")
    source_type: Mapped[str] = mapped_column(String(20), default="manual")

    user = relationship("User", back_populates="cards")
