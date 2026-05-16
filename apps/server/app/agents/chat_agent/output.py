from __future__ import annotations

from app.agents.chat_agent.state import WebContext
from app.schemas.card import CardRead
from app.schemas.message import CitationRead


def build_citations(
    *,
    retrieved_cards: list[CardRead],
    searched_contexts: list[WebContext],
) -> list[CitationRead]:
    citations: list[CitationRead] = []
    for card in retrieved_cards:
        source_text = card.content.replace("\n", " ").strip()
        snippet = source_text[:140]
        if len(source_text) > 140:
            snippet = f"{snippet}..."
        citations.append(
            CitationRead(
                type="knowledge_card",
                title=card.title,
                source_id=card.id,
                snippet=snippet,
            )
        )

    for context in searched_contexts:
        snippet = context.snippet.strip() or context.content.strip()[:140]
        if len(snippet) > 140:
            snippet = f"{snippet[:140]}..."
        citations.append(
            CitationRead(
                type="web",
                title=context.title,
                url=context.url,
                snippet=snippet,
            )
        )

    return citations
