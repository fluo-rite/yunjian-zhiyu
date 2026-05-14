from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from app.schemas.card import CardRead


@tool
def retrieval_knowledge_cards_tool(
    query: str,
    user_id: Annotated[str, InjectedState("user_id")],
) -> dict:
    """检索和问题相关的知识卡片。

    Args:
        query (str): 问题

    Returns:
        dict: 一个字典，dict[items]为检索到的卡片列表
    """
    # TODO Placeholder implementation. The real tool should query the user-scoped vector store by user_id.
    print("检索问题：{query}，用户id：{user_id}")
    placeholder_card = CardRead(
        id="placeholder-card",
        title="占位知识卡片",
        summary="这里是知识卡检索工具的占位结果，后续会替换成真实向量检索。",
        content=f"当前用户 {user_id} 的知识卡检索尚未接入向量库。原始问题是：{query}",
        card_type="concept",
        tags=["placeholder"],
        status="active",
        source_type="manual",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    payload = {
        "type": "knowledge_retrieval",
        "user_id": user_id,
        "query": query,
        "items": [placeholder_card.model_dump(mode="json", by_alias=True)],
    }
    return payload
