from __future__ import annotations

import hashlib
from dataclasses import dataclass
from functools import lru_cache

from arq.connections import RedisSettings, create_pool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import delete, select

from app.core.config import get_settings
from app.core.db import SessionLocal, utc_now
from app.models.card import KnowledgeCard
from app.models.knowledge_source import KnowledgeSource
from app.services.embedding_service import get_embedding_service


class GeneratedKnowledgeCard(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list, max_length=8)


class GeneratedKnowledgeCardBatch(BaseModel):
    cards: list[GeneratedKnowledgeCard] = Field(default_factory=list, min_length=1, max_length=20)


class CardGenerationServiceConfigurationError(RuntimeError):
    pass


class CardGenerationService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.llm_base_url or not settings.llm_api_key or not settings.llm_model:
            raise CardGenerationServiceConfigurationError("LLM is not configured.")
        self._model = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout_seconds,
            temperature=0.2,
            max_retries=2,
        ).with_structured_output(GeneratedKnowledgeCardBatch)

    def generate_cards(self, *, source_name: str, source_type: str, raw_content: str) -> GeneratedKnowledgeCardBatch:
        prompt = (
            "你是知识整理助手。请从用户提供的原始素材中提炼出 1 到多个可检索的知识卡片。\n"
            "要求：\n"
            "1. 每张卡片只保留一个清晰知识点。\n"
            "2. content 必须是适合后续检索与回答引用的完整知识描述，不要只是原文摘抄。\n"
            "3. title 简洁清晰，主要给用户展示。\n"
            "4. tags 生成 2 到 5 个高质量主题词，不要泛词。\n"
            "5. 如果原始内容很短，只生成 1 张卡片。\n\n"
            f"来源名称：{source_name}\n"
            f"来源类型：{source_type}\n"
            f"原始内容：\n{raw_content.strip()}"
        )
        return self._model.invoke(prompt)

    @staticmethod
    def content_hash(content: str) -> str:
        return hashlib.sha256(content.strip().encode("utf-8")).hexdigest()


@lru_cache
def get_card_generation_service() -> CardGenerationService:
    return CardGenerationService()


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

        generation_service = get_card_generation_service()
        embedding_service = get_embedding_service()
        batch = generation_service.generate_cards(
            source_name=source.name,
            source_type=source.source_type,
            raw_content=source.raw_content,
        )

        db.execute(delete(KnowledgeCard).where(KnowledgeCard.source_id == source.id))
        db.flush()

        for item in batch.cards:
            normalized_content = item.content.strip()
            db.add(
                KnowledgeCard(
                    user_id=source.user_id,
                    source_id=source.id,
                    source_type=source.source_type,
                    title=item.title.strip(),
                    content=normalized_content,
                    tags=[tag.strip() for tag in item.tags if tag.strip()][:5],
                    status="pending",
                    embedding=embedding_service.embed_content(normalized_content),
                    embedding_model=embedding_service.model_name,
                    embedding_updated_at=utc_now(),
                    content_hash=generation_service.content_hash(normalized_content),
                )
            )

        source.status = "ready"
        db.add(source)
        db.commit()
    except Exception:
        db.rollback()
        source = db.execute(select(KnowledgeSource).where(KnowledgeSource.id == source_id)).scalar_one_or_none()
        if source is not None:
            source.status = "failed"
            db.add(source)
            db.commit()
        raise
    finally:
        db.close()


async def process_knowledge_source_job(ctx: dict, *, job: dict) -> None:  # pragma: no cover - ARQ entrypoint
    _ = ctx
    process_knowledge_source_sync(job["source_id"])
