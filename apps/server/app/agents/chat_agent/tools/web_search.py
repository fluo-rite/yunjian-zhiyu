from __future__ import annotations

from langchain_core.tools import tool


@tool
def web_search_tool(query: str) -> dict:
    """联网搜索占位工具。当前返回标准化空结果，后续可替换为真实 provider。"""
    return {
        "type": "web_search",
        "query": query,
        "items": [],
    }
