from __future__ import annotations

import hashlib
from dataclasses import dataclass
from functools import lru_cache

from arq.connections import RedisSettings, create_pool
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models.knowledge_source import KnowledgeSource
from app.services.knowledge_ingestion.extract import get_card_generation_service
from app.services.knowledge_ingestion.pipeline import get_knowledge_ingestion_pipeline
from app.services.knowledge_ingestion.types import GeneratedKnowledgeCard, GeneratedKnowledgeCardBatch


class CardGenerationServiceCompatibility:
    @staticmethod
    def content_hash(content: str) -> str:
        return hashlib.sha256(content.strip().encode("utf-8")).hexdigest()


def get_embedding_service():
    from app.services.embedding_service import get_embedding_service as _get_embedding_service

    return _get_embedding_service()


@dataclass(slots=True)
class KnowledgeSourceJob:
    source_id: str


class KnowledgeSourceTaskDispatcher:
    async def enqueue_processing(self, source_id: str) -> None:
        raise NotImplementedError


class ArqKnowledgeSourceTaskDispatcher(KnowledgeSourceTaskDispatcher):
    async def enqueue_processing(self, source_id: str) -> None:
        settings = get_settings()
        redis_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
        try:
            await redis_pool.enqueue_job(
                "process_knowledge_source_job",
                job={"source_id": source_id},
                _queue_name=settings.arq_queue_name,
            )
        finally:
            await redis_pool.close()


@lru_cache
def get_knowledge_source_task_dispatcher() -> KnowledgeSourceTaskDispatcher:
    return ArqKnowledgeSourceTaskDispatcher()


def process_knowledge_source_sync(source_id: str) -> None:
    db = SessionLocal()
    try:
        source = db.execute(select(KnowledgeSource).where(KnowledgeSource.id == source_id)).scalar_one_or_none()
        if source is None:
            return

        get_knowledge_ingestion_pipeline().process_source(db, source)
        db.commit()
    except Exception as error:
        db.rollback()
        source = db.execute(select(KnowledgeSource).where(KnowledgeSource.id == source_id)).scalar_one_or_none()
        if source is not None:
            source.status = "failed"
            source.failure_reason = f"{type(error).__name__}: {error}"
            db.add(source)
            db.commit()
        raise
    finally:
        db.close()


async def process_knowledge_source_job(ctx: dict, *, job: dict) -> None:  # pragma: no cover - ARQ entrypoint
    _ = ctx
    process_knowledge_source_sync(job["source_id"])


__all__ = [
    "CardGenerationServiceCompatibility",
    "GeneratedKnowledgeCard",
    "GeneratedKnowledgeCardBatch",
    "KnowledgeSourceJob",
    "KnowledgeSourceTaskDispatcher",
    "ArqKnowledgeSourceTaskDispatcher",
    "get_card_generation_service",
    "get_knowledge_source_task_dispatcher",
    "process_knowledge_source_sync",
    "process_knowledge_source_job",
]
