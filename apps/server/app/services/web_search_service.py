from __future__ import annotations

from functools import lru_cache
from importlib import import_module
from typing import Any

from app.core.config import get_settings


class WebSearchConfigurationError(RuntimeError):
    pass


class WebSearchService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.web_search_url or not settings.web_search_key:
            raise WebSearchConfigurationError("Web search service is not configured.")
        self._url = settings.web_search_url
        self._headers = {"Authorization": f"Bearer {settings.web_search_key}"}

    async def search(self, query: str) -> dict[str, Any]:
        client_session_cls, streamable_http_client = self._load_mcp_client()

        async with streamable_http_client(self._url, headers=self._headers) as streams:
            read_stream, write_stream = streams[:2]
            async with client_session_cls(read_stream, write_stream) as session:
                await session.initialize()
                tools_response = await session.list_tools()
                tool_name = self._resolve_tool_name(tools_response)
                raw_result = await session.call_tool(tool_name, {"query": query.strip()})

        return {
            "type": "web_search",
            "query": query,
            "items": self._normalize_items(raw_result),
        }

    @staticmethod
    def _load_mcp_client():
        try:
            mcp_module = import_module("mcp")
            streamable_http_module = import_module("mcp.client.streamable_http")
        except ImportError as error:  # pragma: no cover - runtime dependency guard
            raise RuntimeError("MCP client dependency is not installed.") from error

        client_session_cls = getattr(mcp_module, "ClientSession", None)
        streamable_http_client = getattr(streamable_http_module, "streamablehttp_client", None)
        if streamable_http_client is None:
            streamable_http_client = getattr(streamable_http_module, "streamable_http_client", None)

        if client_session_cls is None or streamable_http_client is None:
            raise RuntimeError("MCP Python SDK does not expose the expected streamable HTTP client API.")

        return client_session_cls, streamable_http_client

    @staticmethod
    def _resolve_tool_name(tools_response: Any) -> str:
        tools = getattr(tools_response, "tools", None)
        if tools is None and isinstance(tools_response, dict):
            tools = tools_response.get("tools")
        if not tools:
            raise RuntimeError("Web search MCP server returned no tools.")

        tool_names = [getattr(tool, "name", None) or tool.get("name") for tool in tools]
        preferred_names = ["web_search", "search", "WebSearch", "webSearch"]
        for preferred_name in preferred_names:
            if preferred_name in tool_names:
                return preferred_name
        if len(tool_names) == 1 and tool_names[0]:
            return tool_names[0]
        raise RuntimeError(f"Unable to resolve a unique web search tool from MCP server: {tool_names}")

    @staticmethod
    def _normalize_items(raw_result: Any) -> list[dict[str, str]]:
        structured = getattr(raw_result, "structuredContent", None)
        if structured is None:
            structured = getattr(raw_result, "structured_content", None)
        if structured is None and isinstance(raw_result, dict):
            structured = raw_result.get("structuredContent") or raw_result.get("structured_content")

        content_entries = getattr(raw_result, "content", None)
        if content_entries is None and isinstance(raw_result, dict):
            content_entries = raw_result.get("content")

        items = WebSearchService._extract_structured_items(structured)
        if not items:
            text_blob = WebSearchService._extract_text_blob(content_entries)
            if text_blob:
                items = [
                    {
                        "title": "Web Search Result",
                        "url": "",
                        "snippet": text_blob[:200],
                        "content": text_blob,
                    }
                ]
        return items

    @staticmethod
    def _extract_structured_items(structured: Any) -> list[dict[str, str]]:
        candidate_list: list[Any] = []

        if isinstance(structured, list):
            candidate_list = structured
        elif isinstance(structured, dict):
            for key in ("items", "results", "data", "records", "hits"):
                value = structured.get(key)
                if isinstance(value, list):
                    candidate_list = value
                    break
            if not candidate_list and all(isinstance(structured.get(key), str) for key in ("title", "url")):
                candidate_list = [structured]

        normalized_items: list[dict[str, str]] = []
        for candidate in candidate_list:
            if not isinstance(candidate, dict):
                continue
            title = WebSearchService._pick_str(candidate, "title", "name", "headline") or "Web Search Result"
            url = WebSearchService._pick_str(candidate, "url", "link", "href") or ""
            snippet = WebSearchService._pick_str(candidate, "snippet", "summary", "description", "abstract")
            content = WebSearchService._pick_str(candidate, "content", "text", "body", "markdown") or snippet or ""
            snippet = snippet or content[:200]
            if not any([title, url, snippet, content]):
                continue
            normalized_items.append(
                {
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "content": content,
                }
            )
        return normalized_items

    @staticmethod
    def _extract_text_blob(content_entries: Any) -> str:
        if not isinstance(content_entries, list):
            return ""
        chunks: list[str] = []
        for entry in content_entries:
            if isinstance(entry, str):
                chunks.append(entry)
                continue
            text = getattr(entry, "text", None)
            if isinstance(text, str):
                chunks.append(text)
                continue
            if isinstance(entry, dict) and isinstance(entry.get("text"), str):
                chunks.append(entry["text"])
        return "\n\n".join(chunk.strip() for chunk in chunks if chunk.strip()).strip()

    @staticmethod
    def _pick_str(item: dict[str, Any], *keys: str) -> str | None:
        for key in keys:
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None


@lru_cache
def get_web_search_service() -> WebSearchService:
    return WebSearchService()
