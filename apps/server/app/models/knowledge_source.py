from sqlalchemy import CheckConstraint, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class KnowledgeSource(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_sources"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('manual_text', 'document', 'messages')",
            name="ck_knowledge_sources_source_type",
        ),
        CheckConstraint(
            "status IN ('processing', 'ready', 'failed')",
            name="ck_knowledge_sources_status",
        ),
    )

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    source_type: Mapped[str] = mapped_column(String(20))
    raw_content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="processing", index=True)
    source_metadata: Mapped[dict | None] = mapped_column("source_meta", JSON, nullable=True)

    user = relationship("User", back_populates="knowledge_sources")
    cards = relationship("KnowledgeCard", back_populates="source")
