from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from app.agents.chat_agent.state import WebContext
from app.schemas.card import CardRead


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
