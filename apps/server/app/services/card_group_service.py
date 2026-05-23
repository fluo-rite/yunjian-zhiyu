from __future__ import annotations

from sqlalchemy import delete, insert, select
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
    def add_cards(db: Session, user: User, *, group: CardGroup, card_ids: list[str]) -> None:
        cards = (
            db.execute(
                select(KnowledgeCard).where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.id.in_(card_ids),
                )
            )
            .scalars()
            .all()
        )
        if len(cards) != len(set(card_ids)):
            raise ValueError("Card not found.")

        existing_ids = set(
            db.execute(
                select(CardGroupItem.card_id).where(
                    CardGroupItem.group_id == group.id,
                    CardGroupItem.card_id.in_(card_ids),
                )
            )
            .scalars()
            .all()
        )
        missing_ids = [card_id for card_id in card_ids if card_id not in existing_ids]
        if missing_ids:
            db.execute(
                insert(CardGroupItem),
                [{"group_id": group.id, "card_id": card_id} for card_id in missing_ids],
            )
        db.commit()

    @staticmethod
    def remove_cards(db: Session, *, group: CardGroup, card_ids: list[str]) -> None:
        db.execute(
            delete(CardGroupItem).where(
                CardGroupItem.group_id == group.id,
                CardGroupItem.card_id.in_(card_ids),
            )
        )
        db.commit()
