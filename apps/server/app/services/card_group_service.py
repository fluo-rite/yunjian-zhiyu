from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.card import KnowledgeCard
from app.models.card_group import CardGroup
from app.models.card_group_item import CardGroupItem
from app.models.user import User
from app.schemas.card import CardRead
from app.schemas.card_group import CardGroupListResponse, CardGroupRead


class CardGroupService:
    @staticmethod
    def create(db: Session, user: User, *, name: str) -> CardGroupRead:
        group = CardGroup(user_id=user.id, name=name.strip())
        db.add(group)
        db.commit()
        db.refresh(group)
        return CardGroupRead.model_validate(group)

    @staticmethod
    def list(db: Session, user: User) -> CardGroupListResponse:
        groups = (
            db.execute(
                select(CardGroup)
                .where(CardGroup.user_id == user.id)
                .order_by(CardGroup.updated_at.desc())
            )
            .scalars()
            .all()
        )
        return CardGroupListResponse(items=[CardGroupRead.model_validate(group) for group in groups])

    @staticmethod
    def get_or_none(db: Session, user: User, group_id: str) -> CardGroup | None:
        return db.execute(
            select(CardGroup).where(CardGroup.id == group_id, CardGroup.user_id == user.id)
        ).scalar_one_or_none()

    @staticmethod
    def rename(db: Session, group: CardGroup, *, name: str) -> CardGroupRead:
        group.name = name.strip()
        db.add(group)
        db.commit()
        db.refresh(group)
        return CardGroupRead.model_validate(group)

    @staticmethod
    def delete(db: Session, group: CardGroup) -> None:
        db.delete(group)
        db.commit()

    @staticmethod
    def list_cards(db: Session, user: User, group_id: str) -> list[CardRead]:
        cards = (
            db.execute(
                select(KnowledgeCard)
                .join(CardGroupItem, CardGroupItem.card_id == KnowledgeCard.id)
                .join(CardGroup, CardGroup.id == CardGroupItem.group_id)
                .where(CardGroup.id == group_id, CardGroup.user_id == user.id)
                .order_by(KnowledgeCard.updated_at.desc())
            )
            .scalars()
            .all()
        )
        return [CardRead.model_validate(card) for card in cards]

    @staticmethod
    def add_card(db: Session, user: User, *, group: CardGroup, card_id: str) -> None:
        card = db.execute(
            select(KnowledgeCard).where(KnowledgeCard.id == card_id, KnowledgeCard.user_id == user.id)
        ).scalar_one_or_none()
        if card is None:
            raise ValueError("Card not found.")

        existing = db.execute(
            select(CardGroupItem).where(
                CardGroupItem.group_id == group.id,
                CardGroupItem.card_id == card.id,
            )
        ).scalar_one_or_none()
        if existing is None:
            db.add(CardGroupItem(group_id=group.id, card_id=card.id))
            db.commit()

    @staticmethod
    def remove_card(db: Session, *, group: CardGroup, card_id: str) -> None:
        item = db.execute(
            select(CardGroupItem).where(
                CardGroupItem.group_id == group.id,
                CardGroupItem.card_id == card_id,
            )
        ).scalar_one_or_none()
        if item is None:
            return
        db.delete(item)
        db.commit()
