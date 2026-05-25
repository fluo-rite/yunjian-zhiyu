from types import SimpleNamespace

from app.services.rerank_service import (
    DedicatedRerankProvider,
    RerankCandidateView,
    RerankProviderError,
    RerankService,
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


def test_rerank_service_returns_fused_fallback_after_dedicated_provider_error(monkeypatch) -> None:
    service = RerankService()

    def _raise_dedicated(**_kwargs):
        raise RerankProviderError("dedicated timeout")
    monkeypatch.setattr(service._dedicated_provider, "rerank", _raise_dedicated)

    result = service.rerank(
        query="What is the SSR principle?",
        candidates=_build_candidates(),
        limit=2,
    )

    assert result.provider == "fused_order"
    assert result.fallback_to_fused is True
    assert result.items == []
    assert "dedicated timeout" in (result.fallback_reason or "")


def test_dedicated_rerank_provider_uses_openai_post_with_string_documents(monkeypatch) -> None:
    provider = DedicatedRerankProvider()
    candidates = _build_candidates()
    captured: dict[str, object] = {}

    class FakeClient:
        def __init__(self, *, api_key: str, base_url: str, timeout: float, max_retries: int) -> None:
            captured["api_key"] = api_key
            captured["base_url"] = base_url
            captured["timeout"] = timeout
            captured["max_retries"] = max_retries

        def post(self, path: str, *, body: object, cast_to: object):
            captured["path"] = path
            captured["body"] = body
            captured["cast_to"] = cast_to
            return {
                "results": [
                    {"index": 1, "relevance_score": 0.93},
                    {"index": 0, "relevance_score": 0.41},
                ]
            }

    monkeypatch.setattr(
        "app.services.rerank_service.get_settings",
        lambda: SimpleNamespace(
            rerank_base_url="https://example.com/compatible-api/v1/reranks",
            rerank_api_key="test-key",
            rerank_model="qwen3-rerank",
            retrieval_rerank_timeout_seconds=5.0,
        ),
    )
    monkeypatch.setattr("app.services.rerank_service.OpenAI", FakeClient)

    result = provider.rerank(
        query="What is the SSR principle?",
        candidates=candidates,
        limit=2,
    )

    assert captured["base_url"] == "https://example.com/compatible-api/v1/reranks"
    assert captured["path"] == ""
    assert captured["body"] == {
        "model": "qwen3-rerank",
        "query": "What is the SSR principle?",
        "documents": [
            candidates[0].as_document_text(),
            candidates[1].as_document_text(),
        ],
        "top_n": 2,
    }
    assert captured["cast_to"] is object
    assert [(item.card_id, round(item.score, 2)) for item in result] == [
        ("card-2", 0.93),
        ("card-1", 0.41),
    ]


def test_dedicated_rerank_provider_parses_index_based_scores(monkeypatch) -> None:
    class FakeClient:
        def __init__(self, **_kwargs) -> None:
            pass

        def post(self, _path: str, *, body: object, cast_to: object):
            _ = body, cast_to
            return {
                "results": [
                    {"index": 1, "relevance_score": 0.93},
                    {"index": 0, "relevance_score": 0.41},
                ]
            }

    monkeypatch.setattr(
        "app.services.rerank_service.get_settings",
        lambda: SimpleNamespace(
            rerank_base_url="https://example.com/rerank",
            rerank_api_key="test-key",
            rerank_model="test-reranker",
            retrieval_rerank_timeout_seconds=5.0,
        ),
    )
    monkeypatch.setattr("app.services.rerank_service.OpenAI", FakeClient)

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
