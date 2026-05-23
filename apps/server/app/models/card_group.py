from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CardGroup(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "card_groups"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))

    user = relationship("User", back_populates="card_groups")
    items = relationship("CardGroupItem", back_populates="group", passive_deletes="all")
