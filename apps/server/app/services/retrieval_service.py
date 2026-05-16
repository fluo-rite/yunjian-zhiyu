from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import Select, String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models.card import KnowledgeCard
from app.schemas.card import CardRead
from app.services.embedding_service import get_embedding_service


@dataclass(slots=True)
class RetrievedCard:
    card: KnowledgeCard
    dense_rank: int | None = None
    sparse_rank: int | None = None
    fused_score: float = 0.0


class RerankedCardIds(BaseModel):
    card_ids: list[str] = Field(default_factory=list, max_length=20)


class RetrievalService:
    def retrieve_knowledge_cards(self, *, user_id: str, query: str, limit: int = 5) -> list[CardRead]:
        db = SessionLocal()
        try:
            dense_candidates = self._dense_recall(db, user_id=user_id, query=query, limit=max(limit * 4, 10))
            sparse_candidates = self._sparse_recall(db, user_id=user_id, query=query, limit=max(limit * 4, 10))
            fused_candidates = self._fuse_rrf(dense_candidates, sparse_candidates)
            reranked = self._rerank_candidates(query=query, candidates=fused_candidates, limit=limit)
            return [CardRead.model_validate(item.card) for item in reranked[:limit]]
        finally:
            db.close()

    def _dense_recall(self, db: Session, *, user_id: str, query: str, limit: int) -> list[RetrievedCard]:
        if db.bind is None or db.bind.dialect.name != "postgresql":
            raise RuntimeError("Dense retrieval requires a PostgreSQL database with pgvector enabled.")

        query_embedding = get_embedding_service().embed_query(query)
        statement: Select[tuple[KnowledgeCard]] = (
            select(KnowledgeCard)
            .where(
                KnowledgeCard.user_id == user_id,
                KnowledgeCard.status == "active",
                KnowledgeCard.embedding.is_not(None),
            )
            .order_by(KnowledgeCard.embedding.cosine_distance(query_embedding))
            .limit(limit)
        )
        cards = db.execute(statement).scalars().all()
        return [RetrievedCard(card=card, dense_rank=index) for index, card in enumerate(cards, start=1)]

    def _sparse_recall(self, db: Session, *, user_id: str, query: str, limit: int) -> list[RetrievedCard]:
        if db.bind is not None and db.bind.dialect.name == "postgresql":
            ts_query = func.websearch_to_tsquery("simple", query.strip())
            searchable_text = func.concat(
                KnowledgeCard.content,
                " ",
                func.coalesce(cast(KnowledgeCard.tags, String), ""),
            )
            statement = (
                select(KnowledgeCard)
                .where(
                    KnowledgeCard.user_id == user_id,
                    KnowledgeCard.status == "active",
                    func.to_tsvector("simple", searchable_text).op("@@")(ts_query),
                )
                .order_by(
                    func.ts_rank_cd(func.to_tsvector("simple", searchable_text), ts_query).desc(),
                    KnowledgeCard.updated_at.desc(),
                )
                .limit(limit)
            )
            cards = db.execute(statement).scalars().all()
        else:
            pattern = f"%{query.strip()}%"
            cards = (
                db.execute(
                    select(KnowledgeCard)
                    .where(
                        KnowledgeCard.user_id == user_id,
                        KnowledgeCard.status == "active",
                        or_(
                            KnowledgeCard.content.ilike(pattern),
                            cast(KnowledgeCard.tags, String).ilike(pattern),
                        ),
                    )
                    .order_by(KnowledgeCard.updated_at.desc())
                    .limit(limit)
                )
                .scalars()
                .all()
            )
        return [RetrievedCard(card=card, sparse_rank=index) for index, card in enumerate(cards, start=1)]

    def _fuse_rrf(
        self,
        dense_candidates: Iterable[RetrievedCard],
        sparse_candidates: Iterable[RetrievedCard],
    ) -> list[RetrievedCard]:
        candidate_map: dict[str, RetrievedCard] = {}
        for candidate in dense_candidates:
            candidate.fused_score += 1 / (60 + (candidate.dense_rank or 0))
            candidate_map[candidate.card.id] = candidate
        for sparse_candidate in sparse_candidates:
            existing = candidate_map.get(sparse_candidate.card.id)
            if existing is None:
                existing = sparse_candidate
                candidate_map[sparse_candidate.card.id] = existing
            else:
                existing.sparse_rank = sparse_candidate.sparse_rank
            existing.fused_score += 1 / (60 + (sparse_candidate.sparse_rank or 0))
        return sorted(
            candidate_map.values(),
            key=lambda item: (item.fused_score, item.card.updated_at),
            reverse=True,
        )

    def _rerank_candidates(
        self,
        *,
        query: str,
        candidates: list[RetrievedCard],
        limit: int,
    ) -> list[RetrievedCard]:
        if not candidates:
            return []

        settings = get_settings()
        if not settings.rerank_base_url or not settings.rerank_api_key or not settings.rerank_model:
            raise RuntimeError("Rerank service is not configured.")

        rerank_model = ChatOpenAI(
            model=settings.rerank_model,
            api_key=settings.rerank_api_key,
            base_url=settings.rerank_base_url,
            timeout=settings.llm_timeout_seconds,
            temperature=0,
            max_retries=2,
        ).with_structured_output(RerankedCardIds)

        options = "\n\n".join(
            [
                "\n".join(
                    [
                        f"Card ID: {candidate.card.id}",
                        f"Title: {candidate.card.title}",
                        f"Tags: {', '.join(candidate.card.tags)}",
                        f"Content: {candidate.card.content}",
                    ]
                )
                for candidate in candidates[: max(limit * 3, limit)]
            ]
        )
        response = rerank_model.invoke(
            "请根据用户查询对候选知识卡片重新排序，只返回最相关卡片的 card_ids，保持原始 card id，不要新增不存在的 id。\n"
            f"用户查询：{query.strip()}\n\n候选卡片：\n{options}"
        )
        if not response.card_ids:
            return candidates[:limit]

        candidate_map = {candidate.card.id: candidate for candidate in candidates}
        reranked = [candidate_map[card_id] for card_id in response.card_ids if card_id in candidate_map]
        for candidate in candidates:
            if candidate.card.id not in response.card_ids:
                reranked.append(candidate)
        return reranked[:limit]


@lru_cache
def get_retrieval_service() -> RetrievalService:
    return RetrievalService()
