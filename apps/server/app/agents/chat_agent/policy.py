from __future__ import annotations

from pydantic import AliasChoices, BaseModel, Field

from app.schemas.card import CardRead


class WebSearchDecision(BaseModel):
    should_search_web: bool = Field(
        validation_alias=AliasChoices("should_search_web", "is_search_needed")
    )


def build_web_search_decision_prompt(*, query: str, retrieved_cards: list[CardRead]) -> str:
    if retrieved_cards:
        card_summary = "\n".join(f"- {card.title}" for card in retrieved_cards[:5])
    else:
        card_summary = "(none)"

    return "\n".join(
        [
            "你是一个联网搜索决策器，只负责判断当前问题是否值得执行联网搜索。",
            "请基于用户问题和当前本地知识命中情况，输出结构化判断结果。",
            "输出字段名必须是 should_search_web，值为布尔值 true 或 false。",
            "判断原则：",
            "1. 寒暄、问候、感谢、确认、继续等不需要外部信息的问题，返回 false。",
            "2. 如果本地知识已经足够回答，并且问题不依赖最新外部事实，返回 false。",
            "3. 如果问题明显依赖最新、实时、外部世界的信息，返回 true。",
            "4. 如果本地知识没有命中，且问题是事实性、说明性、查询性问题，通常返回 true。",
            "5. 宁可少搜，也不要为简单闲聊触发联网搜索。",
            f"用户问题：{query.strip()}",
            f"本地知识命中数量：{len(retrieved_cards)}",
            "本地知识命中标题：",
            card_summary,
        ]
    )
