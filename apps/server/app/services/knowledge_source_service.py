from __future__ import annotations

from dataclasses import dataclass
from sqlalchemy import Select, delete, func, select, update
from sqlalchemy.orm import Session

from app.models.chat import Chat
from app.models.card import KnowledgeCard
from app.models.knowledge_source import KnowledgeSource
from app.models.message import Message
from app.models.user import User
from app.schemas.common import PaginationMeta
from app.schemas.knowledge_source import (
    CreateKnowledgeSourceFromMessagesRequest,
    CreateKnowledgeSourceFromTextRequest,
    CreateKnowledgeSourceFromUploadedDocumentRequest,
    DeleteKnowledgeSourceRequest,
    KnowledgeSourceCardsResponse,
    KnowledgeSourceDeletePreviewResponse,
    KnowledgeSourceDetailRead,
    KnowledgeSourceListResponse,
    KnowledgeSourceRead,
    LinkedCardPreview,
)
from app.services.card_generation_service import get_knowledge_source_task_dispatcher
from app.services.knowledge_ingestion.parse import get_document_parse_service
from app.services.storage import ObjectStorageValidationError, get_object_storage_service


class KnowledgeSourceNotFoundError(RuntimeError):
    pass


class InvalidKnowledgeSourceMessagesError(RuntimeError):
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
        message_ids = [item.strip() for item in payload.message_ids if item.strip()]
        message_ids = list(dict.fromkeys(message_ids))
        if not message_ids:
            raise InvalidKnowledgeSourceMessagesError("No valid message ids were provided.")

        selected_messages = (
            db.execute(
                select(Message)
                .join(Chat, Chat.id == Message.chat_id)
                .where(
                    Message.id.in_(message_ids),
                    Chat.user_id == user.id,
                )
            )
            .scalars()
            .all()
        )
        if len(selected_messages) != len(message_ids):
            raise InvalidKnowledgeSourceMessagesError("One or more messages were not found.")

        ordered_messages = sorted(selected_messages, key=lambda item: (item.created_at, item.id))
        message_snapshots = [
            {
                "id": message.id,
                "chatId": message.chat_id,
                "role": message.role,
                "content": message.content.strip(),
                "createdAt": message.created_at.isoformat(),
            }
            for message in ordered_messages
            if message.content.strip()
        ]
        if not message_snapshots:
            raise InvalidKnowledgeSourceMessagesError("Selected messages are empty.")

        raw_content = "\n\n".join(
            f"{'用户' if item['role'] == 'user' else '助手'}：{item['content']}"
            for item in message_snapshots
        )
        source = KnowledgeSource(
            user_id=user.id,
            name=payload.name.strip(),
            source_type="messages",
            raw_content=raw_content,
            status="processing",
            source_metadata={
                "messageCount": len(message_snapshots),
                "messageIds": [item["id"] for item in message_snapshots],
                "messages": message_snapshots,
            },
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
        return await KnowledgeSourceService._create_document_source(
            db=db,
            user=user,
            parsed=parsed,
            oss_object_key=None,
        )

    @staticmethod
    async def create_from_uploaded_document(
        db: Session,
        user: User,
        payload: CreateKnowledgeSourceFromUploadedDocumentRequest,
    ) -> KnowledgeSourceRead:
        storage = get_object_storage_service()
        storage.assert_owned_object_key(
            object_key=payload.object_key,
            user_id=user.id,
            source_type="document",
        )
        content_bytes = storage.download_object_bytes(
            user_id=user.id,
            object_key=payload.object_key,
            source_type="document",
        )
        if len(content_bytes) != payload.size:
            raise ObjectStorageValidationError(
                "Uploaded object size does not match the completed upload."
            )

        parsed = KnowledgeSourceService._extract_document_payload(
            name=payload.name,
            filename=payload.filename,
            mime_type=payload.mime_type,
            content_bytes=content_bytes,
        )
        return await KnowledgeSourceService._create_document_source(
            db=db,
            user=user,
            parsed=parsed,
            oss_object_key=payload.object_key,
        )

    @staticmethod
    async def _create_document_source(
        *,
        db: Session,
        user: User,
        parsed: DocumentPayload,
        oss_object_key: str | None,
    ) -> KnowledgeSourceRead:
        source = KnowledgeSource(
            user_id=user.id,
            name=parsed.name,
            source_type="document",
            raw_content=parsed.raw_content,
            status="processing",
            oss_object_key=oss_object_key,
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
        if source.oss_object_key:
            get_object_storage_service().delete_object(
                user_id=user.id,
                object_key=source.oss_object_key,
                source_type=source.source_type,
            )
        if payload.delete_cards:
            db.execute(
                delete(KnowledgeCard).where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.source_id == source.id,
                )
            )
        else:
            db.execute(
                update(KnowledgeCard)
                .where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.source_id == source.id,
                )
                .values(source_id=None)
            )
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
        parsed = get_document_parse_service().parse_document_bytes(
            filename=filename,
            mime_type=mime_type,
            content_bytes=content_bytes,
        )
        raw_content = "\n\n".join(block.text for block in parsed.blocks if block.text.strip())

        return DocumentPayload(
            name=name.strip(),
            raw_content=raw_content.strip(),
            source_metadata={
                "filename": filename,
                "mimeType": mime_type,
                "parserUsed": parsed.parser_used,
                "parsedBlocks": [block.to_metadata() for block in parsed.blocks],
            },
        )
