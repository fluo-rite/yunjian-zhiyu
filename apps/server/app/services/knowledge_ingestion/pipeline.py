from __future__ import annotations

from functools import lru_cache

from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from app.core.db import utc_now
from app.models.card import KnowledgeCard
from app.models.knowledge_source import KnowledgeSource
from app.services.knowledge_ingestion.chunker import get_chunk_build_service
from app.services.knowledge_ingestion.clean import get_content_clean_service
from app.services.knowledge_ingestion.parse import get_document_parse_service
from app.services.knowledge_ingestion.quality import get_card_quality_service
from app.services.knowledge_ingestion.types import ExtractedCardDraft


class KnowledgeIngestionPipeline:
    def process_source(self, db: Session, source: KnowledgeSource) -> None:
        processing_meta: dict[str, object] = {"sourceType": source.source_type}

        document_blocks = None
        manual_text = None
        if source.source_type == "document":
            parsed = get_document_parse_service().parse_stored_document(source)
            cleaned_blocks = get_content_clean_service().clean_document_blocks(parsed.blocks)
            document_blocks = cleaned_blocks
            processing_meta["parserUsed"] = parsed.parser_used
            processing_meta["parsedBlockCount"] = len(parsed.blocks)
            processing_meta["cleanedBlockCount"] = len(cleaned_blocks)
        elif source.source_type == "manual_text":
            manual_text = get_content_clean_service().clean_manual_text(source.raw_content)

        chunks = get_chunk_build_service().build_chunks(
            source=source,
            document_blocks=document_blocks,
            manual_text=manual_text,
        )
        processing_meta["chunkCount"] = len(chunks)

        if not chunks:
            processing_meta["generatedCardCount"] = 0
            processing_meta["finalCardCount"] = 0
            db.execute(delete(KnowledgeCard).where(KnowledgeCard.source_id == source.id))
            db.flush()
            self._mark_source_failed(
                db,
                source_id=source.id,
                processing_meta=processing_meta,
                reason="No usable content chunks were produced from the source.",
            )
            return

        from app.services.card_generation_service import get_card_generation_service

        generation_service = get_card_generation_service()
        quality_service = get_card_quality_service()
        draft_cards: list[ExtractedCardDraft] = []
        batches = generation_service.generate_cards_for_chunks(source_name=source.name, chunks=chunks)
        for chunk, batch in zip(chunks, batches, strict=True):
            draft_cards.extend(
                quality_service.from_generated(source_chunk_id=chunk.chunk_id, cards=batch.cards)
            )

        processing_meta["generatedCardCount"] = len(draft_cards)
        refined_cards = quality_service.refine_cards(draft_cards)
        processing_meta["finalCardCount"] = len(refined_cards)

        db.execute(delete(KnowledgeCard).where(KnowledgeCard.source_id == source.id))
        db.flush()

        if not draft_cards:
            self._mark_source_failed(
                db,
                source_id=source.id,
                processing_meta=processing_meta,
                reason="No knowledge cards were generated from the source content.",
            )
            return

        if not refined_cards:
            self._mark_source_failed(
                db,
                source_id=source.id,
                processing_meta=processing_meta,
                reason="No valid knowledge cards remained after refinement.",
            )
            return

        embedding_model_name = self._embedding_model_name()
        db.add_all(
            [
                KnowledgeCard(
                    user_id=source.user_id,
                    source_id=source.id,
                    source_type=source.source_type,
                    title=card.title,
                    content=card.content,
                    tags=card.tags,
                    status="pending",
                    embedding=card.embedding,
                    embedding_model=embedding_model_name,
                    embedding_updated_at=utc_now(),
                    content_hash=card.content_hash,
                )
                for card in refined_cards
            ]
        )

        db.execute(
            update(KnowledgeSource)
            .where(KnowledgeSource.id == source.id)
            .values(
                status="ready",
                failure_reason=None,
                processing_meta=processing_meta,
            )
        )

    @staticmethod
    def _mark_source_failed(
        db: Session,
        *,
        source_id: str,
        processing_meta: dict[str, object],
        reason: str,
    ) -> None:
        db.execute(
            update(KnowledgeSource)
            .where(KnowledgeSource.id == source_id)
            .values(
                status="failed",
                failure_reason=reason,
                processing_meta=processing_meta,
            )
        )

    @staticmethod
    def _embedding_model_name() -> str | None:
        from app.services.card_generation_service import get_embedding_service

        return get_embedding_service().model_name


@lru_cache
def get_knowledge_ingestion_pipeline() -> KnowledgeIngestionPipeline:
    return KnowledgeIngestionPipeline()
