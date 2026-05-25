from __future__ import annotations

from app.services.knowledge_ingestion.types import RuntimeChunk

_CARD_EXTRACTION_INSTRUCTIONS = [
    "You are a knowledge ingestion assistant.",
    "Extract 0 or more standalone knowledge cards from the provided content.",
    "Each card should focus on one clear idea.",
    "The content field must be a complete, readable knowledge statement instead of a raw excerpt.",
    "Resolve pronouns and fill in omitted subjects when possible.",
    "Return 0 cards if the content does not contain meaningful knowledge.",
    "Use concise Chinese titles, ideally 8-28 characters.",
    "Keep content around 80-320 Chinese characters when possible.",
    "Return 1-5 high-quality tags for each card.",
    "For message sources, prioritize explicit conclusions, recommendations, risks, and corrections.",
]


def build_card_extraction_prompt(*, source_name: str, chunk: RuntimeChunk) -> str:
    context_parts = [
        f"Source name: {source_name}",
        f"Source type: {chunk.source_type}",
    ]
    if chunk.current_heading:
        context_parts.append(f"Current heading: {chunk.current_heading}")
    if chunk.parent_heading:
        context_parts.append(f"Parent heading: {chunk.parent_heading}")
    if chunk.question_text:
        context_parts.append(f"Current question: {chunk.question_text}")
    if chunk.previous_text:
        context_parts.append(
            "Previous context (only for pronoun resolution and subject completion, do not copy mechanically):\n"
            f"{chunk.previous_text.strip()}"
        )

    extraction_target = chunk.text.strip()
    if chunk.question_text or chunk.answer_text:
        extraction_target = (
            f"Question: {(chunk.question_text or '').strip()}\n"
            f"Answer: {(chunk.answer_text or '').strip()}"
        ).strip()

    return (
        "\n".join(_CARD_EXTRACTION_INSTRUCTIONS)
        + "\n\n"
        + "\n".join(context_parts)
        + "\n\nContent to process:\n"
        + extraction_target
    )
