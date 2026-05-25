import json
from types import SimpleNamespace

from app.services.rerank_service import (
    DedicatedRerankProvider,
    RerankCandidateView,
    RerankProviderError,
    RerankService,
    RerankedItem,
)


def _build_candidates() -> list[RerankCandidateView]:
    return [
        RerankCandidateView(
            card_id="card-1",
            title="FastAPI route basics",
            tags=["FastAPI", "Routing"],
            content_excerpt="FastAPI usually organizes routes with APIRouter and decorators.",
        ),
        RerankCandidateView(
            card_id="card-2",
            title="SSR rendering",
            tags=["SSR"],
            content_excerpt="Server-side rendering resolves HTML on the server before sending it.",
        ),
    ]


def test_rerank_service_uses_llm_fallback_after_dedicated_provider_error(monkeypatch) -> None:
    service = RerankService()

    def _raise_dedicated(**_kwargs):
        raise RerankProviderError("dedicated timeout")

    def _llm_success(**_kwargs):
        return [RerankedItem(card_id="card-2", score=0.88)]

    monkeypatch.setattr("app.services.rerank_service.get_settings", lambda: SimpleNamespace(retrieval_rerank_provider="dedicated"))
    monkeypatch.setattr(service._dedicated_provider, "rerank", _raise_dedicated)
    monkeypatch.setattr(service._llm_fallback_provider, "rerank", _llm_success)

    result = service.rerank(
        query="What is the SSR principle?",
        candidates=_build_candidates(),
        limit=2,
    )

    assert result.provider == "llm_fallback"
    assert result.fallback_to_fused is False
    assert [(item.card_id, item.score) for item in result.items] == [("card-2", 0.88)]


def test_rerank_service_returns_fused_fallback_when_all_providers_fail(monkeypatch) -> None:
    service = RerankService()

    def _raise_dedicated(**_kwargs):
        raise RerankProviderError("dedicated timeout")

    def _raise_llm(**_kwargs):
        raise RerankProviderError("llm invalid json")

    monkeypatch.setattr("app.services.rerank_service.get_settings", lambda: SimpleNamespace(retrieval_rerank_provider="dedicated"))
    monkeypatch.setattr(service._dedicated_provider, "rerank", _raise_dedicated)
    monkeypatch.setattr(service._llm_fallback_provider, "rerank", _raise_llm)

    result = service.rerank(
        query="What is the SSR principle?",
        candidates=_build_candidates(),
        limit=2,
    )

    assert result.provider == "fused_order"
    assert result.fallback_to_fused is True
    assert "dedicated timeout" in (result.fallback_reason or "")
    assert "llm invalid json" in (result.fallback_reason or "")


def test_dedicated_rerank_provider_parses_index_based_scores(monkeypatch) -> None:
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self) -> bytes:
            return json.dumps(
                {
                    "results": [
                        {"index": 1, "relevance_score": 0.93},
                        {"index": 0, "relevance_score": 0.41},
                    ]
                }
            ).encode("utf-8")

    monkeypatch.setattr(
        "app.services.rerank_service.get_settings",
        lambda: SimpleNamespace(
            rerank_base_url="https://example.com/rerank",
            rerank_api_key="test-key",
            rerank_model="test-reranker",
            retrieval_rerank_timeout_seconds=5.0,
        ),
    )
    monkeypatch.setattr("app.services.rerank_service.urlopen", lambda *_args, **_kwargs: FakeResponse())

    provider = DedicatedRerankProvider()
    result = provider.rerank(
        query="What is the SSR principle?",
        candidates=_build_candidates(),
        limit=2,
    )

    assert [(item.card_id, round(item.score, 2)) for item in result] == [
        ("card-2", 0.93),
        ("card-1", 0.41),
    ]
