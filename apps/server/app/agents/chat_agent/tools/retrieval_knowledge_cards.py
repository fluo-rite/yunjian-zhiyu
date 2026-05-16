from __future__ import annotations

from typing import Annotated

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from app.services.retrieval_service import get_retrieval_service


@tool
def retrieval_knowledge_cards_tool(
    query: str,
    user_id: Annotated[str, InjectedState("user_id")],
) -> dict:
    """检索与问题相关的已确认知识卡片。"""
    items = get_retrieval_service().retrieve_knowledge_cards(user_id=user_id, query=query, limit=5)
    return {
        "type": "knowledge_retrieval",
        "user_id": user_id,
        "query": query,
        "items": [item.model_dump(mode="json", by_alias=True) for item in items],
    }
