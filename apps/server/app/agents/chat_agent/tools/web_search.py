from __future__ import annotations

import json

from langchain_core.tools import tool

from app.services.web_search_service import get_web_search_service


@tool
async def web_search_tool(query: str) -> str:
    """执行联网搜索并返回稳定 JSON 字符串。"""
    payload = await get_web_search_service().search(query)
    return json.dumps(payload, ensure_ascii=False)
