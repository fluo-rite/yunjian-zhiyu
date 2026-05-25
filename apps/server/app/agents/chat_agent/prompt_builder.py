from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from app.agents.chat_agent.state import WebContext
from app.schemas.card import CardRead
from app.schemas.message import MessageRead


def build_retrieval_query_rewrite_prompt(*, query: str, pre_messages: list[MessageRead]) -> str:
    if pre_messages:
        history_lines = [
            f"- {message.role}: {message.content.strip()}"
            for message in pre_messages[-8:]
            if message.content.strip()
        ]
        history_block = "\n".join(history_lines) if history_lines else "(无)"
    else:
        history_block = "(无)"

    return "\n".join(
        [
            "你负责把当前用户问题改写成更适合知识检索的查询语句。",
            "请只输出一行纯文本，不要输出 JSON。",
            "不要输出 Markdown、代码块或任何额外说明。",
            "不要添加“改写后的查询：”“检索词：”“查询：”之类的标签。",
            "不要仿照历史消息格式输出，不要重复 user / assistant 前缀。",
            "改写规则：",
            "1. 只能利用最近对话做代词消解、主语补全和省略信息补全。",
            "2. 如果当前用户问题已经自洽完整，就保持原样不变。",
            "3. 不要回答问题本身。",
            "4. 不要添加最近对话里没有出现的新事实。",
            "5. 让改写后的查询尽量简洁，适合语义检索和关键词检索。",
            "6. 最终只输出一条改写后的检索查询，除此之外不要输出任何内容。",
            "最近对话：",
            history_block,
            f"当前用户问题：\n{query.strip()}",
        ]
    )


def build_web_search_decision_prompt(*, query: str, retrieved_cards: list[CardRead]) -> str:
    if retrieved_cards:
        card_summary = "\n".join(f"- {card.title}" for card in retrieved_cards[:5])
    else:
        card_summary = "(无)"

    return "\n".join(
        [
            "你是一个联网搜索决策器，只负责判断当前问题是否值得执行联网搜索。",
            "请基于用户问题和当前本地知识命中情况，输出结构化判断结果。",
            "输出字段名必须是 should_search_web，值必须是布尔值 true 或 false。",
            "判断规则：",
            "1. 寒暄、问候、感谢、确认、继续等不依赖外部信息的问题，一律返回 false。",
            "2. 如果本地知识已经足够回答，并且问题不依赖最新外部事实，一律返回 false。",
            "3. 如果问题明显依赖最新、实时、外部世界的信息，应返回 true。",
            "4. 如果本地知识没有命中，且问题属于事实性、说明性、查询性问题，通常返回 true。",
            "5. 宁可少搜，也不要为了简单闲聊触发联网搜索。",
            "6. 不要输出解释，不要输出额外字段，只返回结构化结果。",
            f"用户问题：{query.strip()}",
            f"本地知识命中数量：{len(retrieved_cards)}",
            "本地知识命中标题：",
            card_summary,
        ]
    )


class ChatPromptBuilder:
    @staticmethod
    def build_reply_prompt(
        *,
        history_messages: list[BaseMessage],
        user_message: str,
        use_knowledge: bool,
        use_web_search: bool,
        retrieved_cards: list[CardRead],
        searched_contexts: list[WebContext],
    ) -> list[BaseMessage]:
        system_prompt = ChatPromptBuilder._build_reply_system_prompt(
            use_knowledge=use_knowledge,
            use_web_search=use_web_search,
            has_card_context=bool(retrieved_cards),
            has_web_context=bool(searched_contexts),
        )
        context_blocks: list[str] = []
        card_context = ChatPromptBuilder._build_card_context(retrieved_cards)
        if card_context:
            context_blocks.append(f"知识卡片上下文：\n{card_context}")

        web_context = ChatPromptBuilder._build_web_context(searched_contexts)
        if web_context:
            context_blocks.append(f"联网搜索上下文：\n{web_context}")

        final_user_message = user_message.strip()
        if context_blocks:
            final_user_message = "\n\n".join([*context_blocks, f"用户问题：\n{final_user_message}"])

        return [
            SystemMessage(content=system_prompt),
            *history_messages,
            HumanMessage(content=final_user_message),
        ]

    @staticmethod
    def _build_reply_system_prompt(
        *,
        use_knowledge: bool,
        use_web_search: bool,
        has_card_context: bool,
        has_web_context: bool,
    ) -> str:
        lines = [
            "你是云笺智语里的学习助手。",
            "请用简洁、结构化、便于继续追问的方式回答。",
            "如果提供了上下文，请优先依据上下文回答，不要编造未提供的事实。",
        ]
        if use_knowledge and has_card_context:
            lines.append("本轮已经提供知识卡片，请优先依据知识卡片回答。")
        elif use_knowledge:
            lines.append("本轮允许使用知识卡片，但当前没有命中可用卡片，不要假装引用了知识库内容。")

        if use_web_search and has_web_context:
            lines.append("本轮已经提供联网搜索结果，请仅在这些搜索结果支持的范围内引用外部事实。")
        elif use_web_search:
            lines.append("本轮允许联网搜索，但当前没有可用网页结果，不要声称已经查到了外部资料。")

        return "\n".join(lines)

    @staticmethod
    def _build_card_context(retrieved_cards: list[CardRead]) -> str:
        sections: list[str] = []
        for index, card in enumerate(retrieved_cards, start=1):
            parts = [f"[{index}] {card.title}"]
            if card.tags:
                parts.append(f"标签：{', '.join(card.tags)}")
            parts.append(card.content.strip())
            sections.append("\n".join(parts))
        return "\n\n".join(sections)

    @staticmethod
    def _build_web_context(searched_contexts: list[WebContext]) -> str:
        sections: list[str] = []
        for index, context in enumerate(searched_contexts, start=1):
            sections.append(
                "\n".join(
                    [
                        f"[{index}] {context.title}",
                        context.url,
                        context.snippet.strip(),
                        context.content.strip(),
                    ]
                ).strip()
            )
        return "\n\n".join(sections)
