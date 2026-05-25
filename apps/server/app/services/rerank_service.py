from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from openai import OpenAI

from app.core.config import get_settings


@dataclass(slots=True)
class RerankCandidateView:
    card_id: str
    title: str
    tags: list[str]
    content_excerpt: str

    def as_document_text(self) -> str:
        tags = ", ".join(self.tags) if self.tags else "(none)"
        return (
            f"Title: {self.title}\n"
            f"Tags: {tags}\n"
            f"Content excerpt: {self.content_excerpt}"
        )


@dataclass(slots=True)
class RerankedItem:
    card_id: str
    score: float


@dataclass(slots=True)
class RerankExecutionResult:
    items: list[RerankedItem]
    provider: str
    fallback_to_fused: bool = False
    fallback_reason: str | None = None


class RerankProviderError(RuntimeError):
    pass


class DedicatedRerankProvider:
    def rerank(
        self,
        *,
        query: str,
        candidates: list[RerankCandidateView],
        limit: int,
    ) -> list[RerankedItem]:
        settings = get_settings()
        if not settings.rerank_base_url or not settings.rerank_api_key or not settings.rerank_model:
            raise RerankProviderError("Dedicated reranker is not configured.")

        client = OpenAI(
            api_key=settings.rerank_api_key,
            base_url=settings.rerank_base_url,
            timeout=settings.retrieval_rerank_timeout_seconds,
            max_retries=0,
        )
        payload = {
            "model": settings.rerank_model,
            "query": query.strip(),
            "documents": [candidate.as_document_text() for candidate in candidates],
            "top_n": min(len(candidates), max(limit * 3, limit)),
        }

        try:
            raw_payload = client.post("", body=payload, cast_to=object)
        except Exception as error:
            raise RerankProviderError(f"Dedicated reranker request failed: {error}") from error

        items = self._parse_items(raw_payload, candidates)
        if not items:
            raise RerankProviderError("Dedicated reranker returned no usable scored results.")
        return items

    @staticmethod
    def _parse_items(
        raw_payload: object,
        candidates: list[RerankCandidateView],
    ) -> list[RerankedItem]:
        candidates_by_index = {index: candidate for index, candidate in enumerate(candidates)}

        result_entries: list[object] = []
        if isinstance(raw_payload, list):
            result_entries = raw_payload
        elif isinstance(raw_payload, dict):
            for key in ("results", "data", "items"):
                value = raw_payload.get(key)
                if isinstance(value, list):
                    result_entries = value
                    break

        scored_items: dict[str, RerankedItem] = {}
        for entry in result_entries:
            if not isinstance(entry, dict):
                continue
            card_id = DedicatedRerankProvider._extract_card_id_from_index(entry, candidates_by_index)
            score = DedicatedRerankProvider._extract_score(entry)
            if card_id is None or score is None:
                continue
            existing = scored_items.get(card_id)
            if existing is None or score > existing.score:
                scored_items[card_id] = RerankedItem(card_id=card_id, score=score)

        return sorted(scored_items.values(), key=lambda item: item.score, reverse=True)

    @staticmethod
    def _extract_card_id_from_index(
        entry: dict[str, object],
        candidates_by_index: dict[int, RerankCandidateView],
    ) -> str | None:
        index_value = entry.get("index")
        if isinstance(index_value, int):
            candidate = candidates_by_index.get(index_value)
            if candidate is not None:
                return candidate.card_id
        return None

    @staticmethod
    def _extract_score(entry: dict[str, object]) -> float | None:
        for key in ("score", "relevance_score", "relevanceScore", "similarity", "normalized_score"):
            value = entry.get(key)
            if isinstance(value, int | float):
                return float(value)
        return None


class RerankService:
    def __init__(self) -> None:
        self._dedicated_provider = DedicatedRerankProvider()

    def rerank(
        self,
        *,
        query: str,
        candidates: list[RerankCandidateView],
        limit: int,
    ) -> RerankExecutionResult:
        try:
            items = self._dedicated_provider.rerank(query=query, candidates=candidates, limit=limit)
        except RerankProviderError as error:
            return RerankExecutionResult(
                items=[],
                provider="fused_order",
                fallback_to_fused=True,
                fallback_reason=f"dedicated:{error}",
            )
        return RerankExecutionResult(items=items, provider="dedicated")


@lru_cache
def get_rerank_service() -> RerankService:
    return RerankService()
