from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

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


class _LlmRerankedItem(BaseModel):
    card_id: str
    score: float = Field(ge=0.0, le=1.0)


class _LlmRerankResponse(BaseModel):
    items: list[_LlmRerankedItem] = Field(default_factory=list, max_length=20)


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

        payload = {
            "model": settings.rerank_model,
            "query": query.strip(),
            "documents": [
                {
                    "id": candidate.card_id,
                    "text": candidate.as_document_text(),
                }
                for candidate in candidates
            ],
            "top_n": min(len(candidates), max(limit * 3, limit)),
            "return_documents": False,
        }

        request = Request(
            settings.rerank_base_url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.rerank_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=settings.retrieval_rerank_timeout_seconds) as response:
                body = response.read().decode("utf-8")
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="ignore")
            raise RerankProviderError(
                f"Dedicated reranker request failed with HTTP {error.code}: {detail}"
            ) from error
        except URLError as error:
            raise RerankProviderError(f"Dedicated reranker request failed: {error}") from error
        except TimeoutError as error:
            raise RerankProviderError("Dedicated reranker request timed out.") from error

        try:
            raw_payload = json.loads(body)
        except json.JSONDecodeError as error:
            raise RerankProviderError("Dedicated reranker returned invalid JSON.") from error

        items = self._parse_items(raw_payload, candidates)
        if not items:
            raise RerankProviderError("Dedicated reranker returned no usable scored results.")
        return items

    @staticmethod
    def _parse_items(
        raw_payload: object,
        candidates: list[RerankCandidateView],
    ) -> list[RerankedItem]:
        candidate_ids = {candidate.card_id for candidate in candidates}
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
            card_id = DedicatedRerankProvider._extract_card_id(entry, candidates_by_index)
            score = DedicatedRerankProvider._extract_score(entry)
            if card_id is None or score is None or card_id not in candidate_ids:
                continue
            existing = scored_items.get(card_id)
            if existing is None or score > existing.score:
                scored_items[card_id] = RerankedItem(card_id=card_id, score=score)

        return sorted(scored_items.values(), key=lambda item: item.score, reverse=True)

    @staticmethod
    def _extract_card_id(
        entry: dict[str, object],
        candidates_by_index: dict[int, RerankCandidateView],
    ) -> str | None:
        for key in ("card_id", "cardId", "document_id", "documentId", "id"):
            value = entry.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        nested_document = entry.get("document")
        if isinstance(nested_document, dict):
            for key in ("card_id", "cardId", "document_id", "documentId", "id"):
                value = nested_document.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()

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


class LlmFallbackRerankProvider:
    def rerank(
        self,
        *,
        query: str,
        candidates: list[RerankCandidateView],
        limit: int,
    ) -> list[RerankedItem]:
        settings = get_settings()
        if not settings.rerank_base_url or not settings.rerank_api_key or not settings.rerank_model:
            raise RerankProviderError("LLM reranker fallback is not configured.")

        model = ChatOpenAI(
            model=settings.rerank_model,
            api_key=settings.rerank_api_key,
            base_url=settings.rerank_base_url,
            timeout=settings.retrieval_rerank_timeout_seconds,
            temperature=0,
            max_retries=2,
        ).with_structured_output(_LlmRerankResponse)

        prompt = self._build_prompt(query=query, candidates=candidates, limit=limit)
        try:
            response = model.invoke(prompt)
        except Exception as error:
            raise RerankProviderError(f"LLM reranker fallback failed: {error}") from error

        seen_ids: set[str] = set()
        items: list[RerankedItem] = []
        for item in response.items:
            if item.card_id in seen_ids:
                continue
            seen_ids.add(item.card_id)
            items.append(RerankedItem(card_id=item.card_id, score=float(item.score)))

        if not items:
            raise RerankProviderError("LLM reranker fallback returned no usable scored results.")

        items.sort(key=lambda item: item.score, reverse=True)
        return items

    @staticmethod
    def _build_prompt(*, query: str, candidates: list[RerankCandidateView], limit: int) -> str:
        candidate_lines: list[str] = []
        for index, candidate in enumerate(candidates, start=1):
            candidate_lines.append(
                "\n".join(
                    [
                        f"Candidate #{index}",
                        f"ID: {candidate.card_id}",
                        candidate.as_document_text(),
                    ]
                )
            )

        return (
            "You are scoring candidate knowledge cards for retrieval precision.\n"
            'Return only valid JSON in this exact shape: {"items":[{"card_id":"<id>","score":0.91}]}\n'
            "Rules:\n"
            "- Only use IDs from the candidate list.\n"
            "- score must be a number from 0.0 to 1.0.\n"
            "- A score near 1.0 means the card directly answers the query.\n"
            "- A score near 0.0 means the card is unrelated or too weak to be useful.\n"
            "- Sort items by score descending.\n"
            f"- Return at most {min(len(candidates), max(limit * 3, limit))} items.\n"
            "- Do not add explanations.\n"
            "- Do not wrap the JSON in markdown.\n"
            "- Do not output extra fields.\n\n"
            f"User query:\n{query.strip()}\n\n"
            f"Candidate cards:\n{'\n\n'.join(candidate_lines)}\n"
        )


class RerankService:
    def __init__(self) -> None:
        self._dedicated_provider = DedicatedRerankProvider()
        self._llm_fallback_provider = LlmFallbackRerankProvider()

    def rerank(
        self,
        *,
        query: str,
        candidates: list[RerankCandidateView],
        limit: int,
    ) -> RerankExecutionResult:
        settings = get_settings()
        provider = settings.retrieval_rerank_provider.strip().lower()
        attempts: list[tuple[str, object]] = []

        if provider == "llm":
            attempts = [("llm_fallback", self._llm_fallback_provider)]
        else:
            attempts = [
                ("dedicated", self._dedicated_provider),
                ("llm_fallback", self._llm_fallback_provider),
            ]

        errors: list[str] = []
        for provider_name, provider_impl in attempts:
            try:
                items = provider_impl.rerank(query=query, candidates=candidates, limit=limit)
            except RerankProviderError as error:
                errors.append(f"{provider_name}:{error}")
                continue
            return RerankExecutionResult(items=items, provider=provider_name)

        return RerankExecutionResult(
            items=[],
            provider="fused_order",
            fallback_to_fused=True,
            fallback_reason=" | ".join(errors) if errors else "No rerank providers available.",
        )


@lru_cache
def get_rerank_service() -> RerankService:
    return RerankService()
