from __future__ import annotations

from langchain_core.tools import tool

from app.services.web_search_service import get_web_search_service


@tool
async def web_search_tool(query: str) -> dict:
    """执行联网搜索并返回标准化结果。"""
    return await get_web_search_service().search(query)
