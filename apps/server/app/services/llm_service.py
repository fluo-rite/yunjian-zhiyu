from dataclasses import dataclass
import textwrap

import httpx

from app.core.config import get_settings
from app.models.card import KnowledgeCard
from app.schemas.message import CitationRead


@dataclass
class GeneratedReply:
    content: str
    model: str
    used_knowledge: bool
    used_web_search: bool
    citations: list[CitationRead]


class LLMService:
    @staticmethod
    def generate_reply(
        *,
        prompt: str,
        knowledge_cards: list[KnowledgeCard],
        use_knowledge: bool,
        use_web_search: bool,
    ) -> GeneratedReply:
        citations = [LLMService._build_knowledge_citation(card) for card in knowledge_cards]
        settings = get_settings()

        if settings.llm_base_url and settings.llm_api_key:
            reply = LLMService._generate_remote_reply(
                prompt=prompt,
                citations=citations,
                use_knowledge=bool(citations) and use_knowledge,
                use_web_search=False,
            )
            if reply is not None:
                return reply

        return LLMService._generate_fallback_reply(
            prompt=prompt,
            citations=citations,
            use_knowledge=use_knowledge,
            use_web_search=use_web_search,
        )

    @staticmethod
    def _generate_remote_reply(
        *,
        prompt: str,
        citations: list[CitationRead],
        use_knowledge: bool,
        use_web_search: bool,
    ) -> GeneratedReply | None:
        settings = get_settings()
        context = "\n\n".join(
            f"[{index}] {citation.title}\n{citation.snippet}"
            for index, citation in enumerate(citations, start=1)
        )
        system_prompt = textwrap.dedent(
            """
            你是云笺智语里的学习助手。请用简洁、结构化、便于继续追问的方式回答。
            如果提供了知识卡片上下文，优先基于这些上下文回答，并避免编造未提供的事实。
            当前暂未接入真实联网搜索，所以不要声称已经使用了外部网页结果。
            """
        ).strip()

        user_prompt = prompt
        if context:
            user_prompt = f"知识卡片上下文：\n{context}\n\n用户问题：\n{prompt}"

        try:
            with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
                response = client.post(
                    f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.llm_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.llm_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.3,
                    },
                )
                response.raise_for_status()
        except httpx.HTTPError:
            return None

        payload = response.json()
        content = payload["choices"][0]["message"]["content"].strip()
        return GeneratedReply(
            content=content,
            model=settings.llm_model,
            used_knowledge=use_knowledge,
            used_web_search=use_web_search,
            citations=citations,
        )

    @staticmethod
    def _generate_fallback_reply(
        *,
        prompt: str,
        citations: list[CitationRead],
        use_knowledge: bool,
        use_web_search: bool,
    ) -> GeneratedReply:
        lines = []

        if use_knowledge and citations:
            lines.append("我先基于你当前知识库里命中的卡片，整理一版可继续追问的回答：")
            lines.append("")
            for index, citation in enumerate(citations, start=1):
                lines.append(f"{index}. {citation.title}：{citation.snippet}")
            lines.append("")
            lines.append("如果你要把这些内容进一步串成学习提纲，我建议优先比较它们的共性、差异和适用场景。")
        else:
            lines.append("我先根据你的问题给出一版结构化回答：")
            lines.append("")
            lines.append(f"你的问题是：{prompt}")
            lines.append("")
            lines.append("建议下一步把问题拆成“核心概念、实践步骤、易错点”三层继续追问，这样更容易沉淀成知识卡片。")

        if use_web_search:
            lines.append("")
            lines.append("说明：本轮没有实际接入联网搜索 provider，所以回答里未包含外部网页引用。")

        return GeneratedReply(
            content="\n".join(lines).strip(),
            model="local-fallback",
            used_knowledge=use_knowledge and bool(citations),
            used_web_search=False,
            citations=citations,
        )

    @staticmethod
    def _build_knowledge_citation(card: KnowledgeCard) -> CitationRead:
        source_text = (card.summary or card.content).replace("\n", " ").strip()
        snippet = source_text[:140]
        if len(source_text) > 140:
            snippet = f"{snippet}..."
        return CitationRead(
            type="knowledge_card",
            title=card.title,
            source_id=card.id,
            snippet=snippet,
        )
