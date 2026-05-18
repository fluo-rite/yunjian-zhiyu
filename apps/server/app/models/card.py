from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON
from pgvector.sqlalchemy import Vector

from app.core.constants import EMBEDDING_VECTOR_DIMENSION
from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class KnowledgeCard(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_cards"
    __table_args__ = (
        Index("ix_knowledge_cards_active_retrieval", "user_id", "status", "updated_at"),
        CheckConstraint(
            "status IN ('pending', 'active', 'archived')",
            name="ck_knowledge_cards_status",
        ),
        CheckConstraint(
            "source_type IN ('manual_text', 'document', 'messages')",
            name="ck_knowledge_cards_source_type",
        ),
    )

    _embedding_type = Vector(EMBEDDING_VECTOR_DIMENSION).with_variant(JSON(), "sqlite")

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source_id: Mapped[str | None] = mapped_column(
        ForeignKey("knowledge_sources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), index=True, default="pending")
    source_type: Mapped[str] = mapped_column(String(20), default="manual_text")
    embedding: Mapped[list[float] | None] = mapped_column(_embedding_type, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    embedding_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    user = relationship("User", back_populates="cards")
    source = relationship("KnowledgeSource", back_populates="cards")
    group_items = relationship("CardGroupItem", back_populates="card", cascade="all, delete-orphan")
