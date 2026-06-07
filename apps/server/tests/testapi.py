from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from langchain_openai import ChatOpenAI


SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.services.embedding_service import (  # noqa: E402
    EmbeddingServiceConfigurationError,
    get_embedding_service,
)
from app.services.rerank_service import (  # noqa: E402
    RerankCandidateView,
    get_rerank_service,
)
from app.services.web_search_service import (  # noqa: E402
    WebSearchService,
    WebSearchConfigurationError,
    get_web_search_service,
)


@dataclass(slots=True)
class CheckResult:
    name: str
    ok: bool
    detail: str


def _mask_secret(value: str | None) -> str:
    if not value:
        return "(missing)"
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}***{value[-4:]}"


def _to_jsonable(value: Any, *, depth: int = 0) -> Any:
    if depth >= 6:
        return str(value)
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _to_jsonable(item, depth=depth + 1) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_jsonable(item, depth=depth + 1) for item in value]
    if hasattr(value, "model_dump"):
        try:
            return _to_jsonable(value.model_dump(), depth=depth + 1)
        except Exception:
            return str(value)
    if hasattr(value, "__dict__"):
        return _to_jsonable(vars(value), depth=depth + 1)
    return str(value)


def print_config_snapshot() -> None:
    settings = get_settings()
    payload = {
        "llm_base_url": settings.llm_base_url,
        "llm_api_key": _mask_secret(settings.llm_api_key),
        "llm_model": settings.llm_model,
        "embedding_api_key": _mask_secret(settings.embedding_api_key),
        "embedding_model": settings.embedding_model,
        "rerank_base_url": settings.rerank_base_url,
        "rerank_api_key": _mask_secret(settings.rerank_api_key),
        "rerank_model": settings.rerank_model,
        "retrieval_rerank_timeout_seconds": settings.retrieval_rerank_timeout_seconds,
        "retrieval_rerank_min_score": settings.retrieval_rerank_min_score,
        "web_search_url": settings.web_search_url,
        "web_search_key": _mask_secret(settings.web_search_key),
    }
    print("=== Config Snapshot ===")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print()


def check_llm() -> CheckResult:
    settings = get_settings()
    if not settings.llm_base_url or not settings.llm_api_key or not settings.llm_model:
        return CheckResult("LLM", False, "LLM_BASE_URL / LLM_API_KEY / LLM_MODEL is missing.")

    try:
        model = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout_seconds,
            temperature=0,
            max_retries=0,
        )
        response = model.invoke("Reply with OK only.")
        content = response.content if isinstance(response.content, str) else str(response.content)
        return CheckResult("LLM", True, f"Call succeeded, response={content[:120]}")
    except Exception as error:  # pragma: no cover - local diagnostics
        return CheckResult("LLM", False, f"{type(error).__name__}: {error}")


def check_embedding() -> CheckResult:
    try:
        service = get_embedding_service()
    except EmbeddingServiceConfigurationError as error:
        return CheckResult("Embedding", False, str(error))

    try:
        vector = service.embed_query("FastAPI routing and dependency injection")
        preview = ", ".join(f"{value:.4f}" for value in vector[:5])
        return CheckResult(
            "Embedding",
            True,
            f"Call succeeded, dimension={len(vector)}, first5=[{preview}]",
        )
    except Exception as error:  # pragma: no cover - local diagnostics
        return CheckResult("Embedding", False, f"{type(error).__name__}: {error}")


def check_rerank() -> CheckResult:
    settings = get_settings()
    if not settings.rerank_base_url or not settings.rerank_api_key or not settings.rerank_model:
        return CheckResult(
            "Rerank",
            False,
            "RERANK_BASE_URL / RERANK_API_KEY / RERANK_MODEL is missing.",
        )

    try:
        service = get_rerank_service()
        response = service.rerank(
            query="How should FastAPI routes be organized?",
            candidates=[
                RerankCandidateView(
                    card_id="card-a",
                    title="FastAPI route basics",
                    tags=["FastAPI", "Routing"],
                    content_excerpt="FastAPI usually organizes routes with APIRouter and decorators.",
                ),
                RerankCandidateView(
                    card_id="card-b",
                    title="PostgreSQL transactions",
                    tags=["Database", "PostgreSQL"],
                    content_excerpt="PostgreSQL transactions provide consistency guarantees.",
                ),
            ],
            limit=2,
        )
        if response.fallback_to_fused:
            return CheckResult("Rerank", False, f"Fallback to fused order: {response.fallback_reason}")
        ranked_ids = [item.card_id for item in response.items]
        score_map = {item.card_id: round(item.score, 4) for item in response.items}
        return CheckResult(
            "Rerank",
            True,
            f"Call succeeded, provider={response.provider}, ranked_ids={ranked_ids}, scores={score_map}",
        )
    except Exception as error:  # pragma: no cover - local diagnostics
        return CheckResult("Rerank", False, f"{type(error).__name__}: {error}")


async def check_web_search_async() -> CheckResult:
    try:
        service = get_web_search_service()
    except WebSearchConfigurationError as error:
        return CheckResult("WebSearch", False, str(error))
    except Exception as error:  # pragma: no cover - local diagnostics
        return CheckResult("WebSearch", False, f"{type(error).__name__}: {error}")

    try:
        payload = await service.search("FastAPI routing")
        items: list[dict[str, Any]] = payload.get("items", [])
        first_title = items[0].get("title") if items else "(no items)"
        return CheckResult(
            "WebSearch",
            True,
            f"Call succeeded, items={len(items)}, first_title={first_title}",
        )
    except Exception as error:  # pragma: no cover - local diagnostics
        return CheckResult("WebSearch", False, f"{type(error).__name__}: {error}")


async def print_web_search_debug() -> None:
    print()
    print("=== WebSearch Raw Debug ===")

    try:
        service = get_web_search_service()
    except Exception as error:  # pragma: no cover - local diagnostics
        print(f"Unable to initialize WebSearchService: {type(error).__name__}: {error}")
        return

    try:
        client_session_cls, streamable_http_client = WebSearchService._load_mcp_client()
        async with streamable_http_client(service._url, headers=service._headers) as streams:
            read_stream, write_stream = streams[:2]
            async with client_session_cls(read_stream, write_stream) as session:
                await session.initialize()
                tools_response = await session.list_tools()
                tool_name = WebSearchService._resolve_tool_name(tools_response)
                raw_result = await session.call_tool(tool_name, {"query": "FastAPI routing"})

        print("Selected tool:")
        print(tool_name)
        print()

        print("Raw MCP result:")
        print(json.dumps(_to_jsonable(raw_result), ensure_ascii=False, indent=2))
        print()

        normalized_items = WebSearchService._normalize_items(raw_result)
        print("Normalized items:")
        print(json.dumps(normalized_items, ensure_ascii=False, indent=2))
        print()
    except Exception as error:  # pragma: no cover - local diagnostics
        print(f"WebSearch raw debug failed: {type(error).__name__}: {error}")


def print_result(result: CheckResult) -> None:
    status = "PASS" if result.ok else "FAIL"
    print(f"[{status}] {result.name}: {result.detail}")


async def main() -> int:
    print_config_snapshot()

    results = [
        check_llm(),
        check_embedding(),
        check_rerank(),
        await check_web_search_async(),
    ]

    print("=== External Service Checks ===")
    for result in results:
        print_result(result)

    await print_web_search_debug()

    failed = [item for item in results if not item.ok]
    print()
    if failed:
        print(f"Completed with {len(failed)} failure(s).")
        return 1

    print("All configured external services are available.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
