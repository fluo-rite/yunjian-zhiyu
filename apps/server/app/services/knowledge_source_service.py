from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from pypdf import PdfReader
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.card import KnowledgeCard
from app.models.knowledge_source import KnowledgeSource
from app.models.user import User
from app.schemas.common import PaginationMeta
from app.schemas.knowledge_source import (
    CreateKnowledgeSourceFromMessagesRequest,
    CreateKnowledgeSourceFromTextRequest,
    DeleteKnowledgeSourceRequest,
    KnowledgeSourceCardsResponse,
    KnowledgeSourceDeletePreviewResponse,
    KnowledgeSourceDetailRead,
    KnowledgeSourceListResponse,
    KnowledgeSourceRead,
    LinkedCardPreview,
)
from app.services.card_generation_service import get_knowledge_source_task_dispatcher


class KnowledgeSourceNotFoundError(RuntimeError):
    pass


@dataclass(slots=True)
class DocumentPayload:
    name: str
    raw_content: str
    source_metadata: dict | None


class KnowledgeSourceService:
    @staticmethod
    async def create_from_text(
        db: Session,
        user: User,
        payload: CreateKnowledgeSourceFromTextRequest,
    ) -> KnowledgeSourceRead:
        source = KnowledgeSource(
            user_id=user.id,
            name=payload.name.strip(),
            source_type="manual_text",
            raw_content=payload.content.strip(),
            status="processing",
            source_metadata=None,
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        try:
            await get_knowledge_source_task_dispatcher().enqueue_processing(source.id)
        except Exception:
            source.status = "failed"
            db.add(source)
            db.commit()
            raise
        return KnowledgeSourceRead.model_validate(source)

    @staticmethod
    async def create_from_messages(
        db: Session,
        user: User,
        payload: CreateKnowledgeSourceFromMessagesRequest,
    ) -> KnowledgeSourceRead:
        messages = [item.strip() for item in payload.messages if item.strip()]
        source = KnowledgeSource(
            user_id=user.id,
            name=payload.name.strip(),
            source_type="messages",
            raw_content="\n\n".join(messages),
            status="processing",
            source_metadata={"messageCount": len(messages)},
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        try:
            await get_knowledge_source_task_dispatcher().enqueue_processing(source.id)
        except Exception:
            source.status = "failed"
            db.add(source)
            db.commit()
            raise
        return KnowledgeSourceRead.model_validate(source)

    @staticmethod
    async def create_from_document(
        db: Session,
        user: User,
        *,
        name: str,
        filename: str,
        mime_type: str | None,
        content_bytes: bytes,
    ) -> KnowledgeSourceRead:
        parsed = KnowledgeSourceService._extract_document_payload(
            name=name,
            filename=filename,
            mime_type=mime_type,
            content_bytes=content_bytes,
        )
        source = KnowledgeSource(
            user_id=user.id,
            name=parsed.name,
            source_type="document",
            raw_content=parsed.raw_content,
            status="processing",
            source_metadata=parsed.source_metadata,
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        try:
            await get_knowledge_source_task_dispatcher().enqueue_processing(source.id)
        except Exception:
            source.status = "failed"
            db.add(source)
            db.commit()
            raise
        return KnowledgeSourceRead.model_validate(source)

    @staticmethod
    def list(
        db: Session,
        user: User,
        *,
        page: int,
        page_size: int,
        status: str | None,
        source_type: str | None,
    ) -> KnowledgeSourceListResponse:
        statement: Select[tuple[KnowledgeSource]] = select(KnowledgeSource).where(
            KnowledgeSource.user_id == user.id
        )
        if status:
            statement = statement.where(KnowledgeSource.status == status)
        if source_type:
            statement = statement.where(KnowledgeSource.source_type == source_type)

        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
        items = (
            db.execute(
                statement.order_by(KnowledgeSource.updated_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            .scalars()
            .all()
        )
        return KnowledgeSourceListResponse(
            items=[KnowledgeSourceRead.model_validate(item) for item in items],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                has_more=page * page_size < total,
            ),
        )

    @staticmethod
    def get_or_raise(db: Session, user: User, source_id: str) -> KnowledgeSource:
        source = db.execute(
            select(KnowledgeSource).where(
                KnowledgeSource.id == source_id,
                KnowledgeSource.user_id == user.id,
            )
        ).scalar_one_or_none()
        if source is None:
            raise KnowledgeSourceNotFoundError(source_id)
        return source

    @staticmethod
    def detail(db: Session, user: User, source_id: str) -> KnowledgeSourceDetailRead:
        source = KnowledgeSourceService.get_or_raise(db, user, source_id)
        return KnowledgeSourceDetailRead.model_validate(source)

    @staticmethod
    def list_cards(db: Session, user: User, source_id: str) -> KnowledgeSourceCardsResponse:
        source = KnowledgeSourceService.get_or_raise(db, user, source_id)
        cards = (
            db.execute(
                select(KnowledgeCard)
                .where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.source_id == source.id,
                )
                .order_by(KnowledgeCard.updated_at.desc())
            )
            .scalars()
            .all()
        )
        from app.schemas.card import CardRead

        return KnowledgeSourceCardsResponse(items=[CardRead.model_validate(card) for card in cards])

    @staticmethod
    def delete_preview(
        db: Session,
        user: User,
        source_id: str,
    ) -> KnowledgeSourceDeletePreviewResponse:
        source = KnowledgeSourceService.get_or_raise(db, user, source_id)
        linked_cards = (
            db.execute(
                select(KnowledgeCard)
                .where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.source_id == source.id,
                )
                .order_by(KnowledgeCard.updated_at.desc())
            )
            .scalars()
            .all()
        )
        return KnowledgeSourceDeletePreviewResponse(
            source=KnowledgeSourceRead.model_validate(source),
            linked_cards=[
                LinkedCardPreview(id=card.id, title=card.title, status=card.status)
                for card in linked_cards
            ],
        )

    @staticmethod
    def delete(
        db: Session,
        user: User,
        source_id: str,
        payload: DeleteKnowledgeSourceRequest,
    ) -> None:
        source = KnowledgeSourceService.get_or_raise(db, user, source_id)
        linked_cards = (
            db.execute(
                select(KnowledgeCard).where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.source_id == source.id,
                )
            )
            .scalars()
            .all()
        )
        if payload.delete_cards:
            for card in linked_cards:
                db.delete(card)
        else:
            for card in linked_cards:
                card.source_id = None
                db.add(card)
        db.delete(source)
        db.commit()

    @staticmethod
    def _extract_document_payload(
        *,
        name: str,
        filename: str,
        mime_type: str | None,
        content_bytes: bytes,
    ) -> DocumentPayload:
        normalized_mime = (mime_type or "").lower()
        lowered_filename = filename.lower()
        if normalized_mime == "application/pdf" or lowered_filename.endswith(".pdf"):
            raw_content = KnowledgeSourceService._extract_pdf_text(content_bytes)
        else:
            raw_content = content_bytes.decode("utf-8")

        return DocumentPayload(
            name=name.strip(),
            raw_content=raw_content.strip(),
            source_metadata={
                "filename": filename,
                "mimeType": mime_type,
            },
        )

    @staticmethod
    def _extract_pdf_text(content_bytes: bytes) -> str:
        reader = PdfReader(BytesIO(content_bytes))
        text = "\n".join((page.extract_text() or "").strip() for page in reader.pages)
        return text.strip()
