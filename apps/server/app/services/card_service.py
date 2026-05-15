from __future__ import annotations

from sqlalchemy import Select, String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models.card import KnowledgeCard
from app.models.user import User
from app.schemas.card import CardCreate, CardListResponse, CardRead, CardStatus, CardType, CardUpdate
from app.schemas.common import PaginationMeta


class CardService:
    @staticmethod
    def create(db: Session, user: User, payload: CardCreate) -> CardRead:
        card = KnowledgeCard(
            user_id=user.id,
            title=payload.title,
            summary=payload.summary,
            content=payload.content,
            card_type=payload.card_type,
            tags=payload.tags,
            status=payload.status,
            source_type=payload.source_type,
        )
        db.add(card)
        db.commit()
        db.refresh(card)
        return CardRead.model_validate(card)

    @staticmethod
    def list(
        db: Session,
        user: User,
        *,
        page: int,
        page_size: int,
        status: CardStatus | None,
        card_type: CardType | None,
        keyword: str | None,
        tag: str | None,
    ) -> CardListResponse:
        statement: Select[tuple[KnowledgeCard]] = select(KnowledgeCard).where(
            KnowledgeCard.user_id == user.id
        )

        if status:
            statement = statement.where(KnowledgeCard.status == status)
        if card_type:
            statement = statement.where(KnowledgeCard.card_type == card_type)
        if keyword:
            pattern = f"%{keyword}%"
            statement = statement.where(
                or_(
                    KnowledgeCard.title.ilike(pattern),
                    KnowledgeCard.summary.ilike(pattern),
                    KnowledgeCard.content.ilike(pattern),
                )
            )
        if tag:
            statement = statement.where(cast(KnowledgeCard.tags, String).ilike(f'%"{tag}"%'))

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
    def list_active_cards(db: Session, user: User) -> list[KnowledgeCard]:
        return (
            db.execute(
                select(KnowledgeCard).where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.status == "active",
                )
            )
            .scalars()
            .all()
        )

    @staticmethod
    def update(db: Session, card: KnowledgeCard, payload: CardUpdate) -> CardRead:
        updates = payload.model_dump(exclude_none=True)
        for field, value in updates.items():
            setattr(card, field, value)
        db.add(card)
        db.commit()
        db.refresh(card)
        return CardRead.model_validate(card)

    @staticmethod
    def delete(db: Session, card: KnowledgeCard) -> None:
        db.delete(card)
        db.commit()
