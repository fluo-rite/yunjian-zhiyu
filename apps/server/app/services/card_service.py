from __future__ import annotations

from sqlalchemy import Select, String, cast, func, or_, select, update
from sqlalchemy.orm import Session

from app.models.card import KnowledgeCard
from app.models.card_group import CardGroup
from app.models.card_group_item import CardGroupItem
from app.models.user import User
from app.schemas.card import (
    ArchiveCardResponse,
    CardListResponse,
    CardRead,
    ConfirmCardsResponse,
)
from app.schemas.common import PaginationMeta


class CardService:
    @staticmethod
    def list(
        db: Session,
        user: User,
        *,
        page: int,
        page_size: int,
        status: str | None,
        source_type: str | None,
        source_id: str | None,
        group_id: str | None,
        keyword: str | None,
    ) -> CardListResponse:
        statement: Select[tuple[KnowledgeCard]] = select(KnowledgeCard).where(
            KnowledgeCard.user_id == user.id
        )
        if status:
            statement = statement.where(KnowledgeCard.status == status)
        if source_type:
            statement = statement.where(KnowledgeCard.source_type == source_type)
        if source_id:
            statement = statement.where(KnowledgeCard.source_id == source_id)
        if group_id:
            statement = statement.join(CardGroupItem).join(CardGroup).where(
                CardGroup.id == group_id,
                CardGroup.user_id == user.id,
            )
        if keyword:
            pattern = f"%{keyword}%"
            statement = statement.where(
                or_(
                    KnowledgeCard.title.ilike(pattern),
                    KnowledgeCard.content.ilike(pattern),
                    cast(KnowledgeCard.tags, String).ilike(pattern),
                )
            )

        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
        cards = (
            db.execute(
                statement.order_by(KnowledgeCard.updated_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            .scalars()
            .all()
        )
        return CardListResponse(
            items=[CardRead.model_validate(card) for card in cards],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                has_more=page * page_size < total,
            ),
        )

    @staticmethod
    def get_or_none(db: Session, user: User, card_id: str) -> KnowledgeCard | None:
        return db.execute(
            select(KnowledgeCard).where(
                KnowledgeCard.id == card_id,
                KnowledgeCard.user_id == user.id,
            )
        ).scalar_one_or_none()

    @staticmethod
    def delete(db: Session, card: KnowledgeCard) -> None:
        db.delete(card)
        db.commit()

    @staticmethod
    def list_by_ids(db: Session, user: User, card_ids: list[str]) -> list[KnowledgeCard]:
        if not card_ids:
            return []
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
        card_map = {card.id: card for card in cards}
        return [card_map[card_id] for card_id in card_ids if card_id in card_map]

    @staticmethod
    def confirm_many(db: Session, cards: list[KnowledgeCard]) -> ConfirmCardsResponse:
        if not cards:
            return ConfirmCardsResponse(items=[])

        card_ids = [card.id for card in cards]
        db.execute(
            update(KnowledgeCard)
            .where(KnowledgeCard.id.in_(card_ids))
            .values(status="active")
        )
        db.commit()
        refreshed_cards = (
            db.execute(select(KnowledgeCard).where(KnowledgeCard.id.in_(card_ids)))
            .scalars()
            .all()
        )
        card_map = {card.id: card for card in refreshed_cards}
        ordered_cards = [card_map[card_id] for card_id in card_ids if card_id in card_map]
        return ConfirmCardsResponse(items=[CardRead.model_validate(card) for card in ordered_cards])

    @staticmethod
    def archive(db: Session, card: KnowledgeCard) -> ArchiveCardResponse:
        card.status = "archived"
        db.add(card)
        db.commit()
        db.refresh(card)
        return ArchiveCardResponse.model_validate(card)
