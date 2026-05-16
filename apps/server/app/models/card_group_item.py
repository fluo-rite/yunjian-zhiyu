from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin


class CardGroupItem(TimestampMixin, Base):
    __tablename__ = "card_group_items"
    __table_args__ = (
        UniqueConstraint("group_id", "card_id", name="uq_card_group_items_group_card"),
    )

    group_id: Mapped[str] = mapped_column(
        ForeignKey("card_groups.id", ondelete="CASCADE"),
        primary_key=True,
    )
    card_id: Mapped[str] = mapped_column(
        ForeignKey("knowledge_cards.id", ondelete="CASCADE"),
        primary_key=True,
    )

    group = relationship("CardGroup", back_populates="items")
    card = relationship("KnowledgeCard", back_populates="group_items")
