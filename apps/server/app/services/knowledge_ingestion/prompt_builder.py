from __future__ import annotations

from app.services.knowledge_ingestion.types import RuntimeChunk

_CARD_EXTRACTION_INSTRUCTIONS = [
    "你是一个知识沉淀助手，负责把输入内容提炼成知识卡片。",
    "请从给定内容中提取 0 张或多张可独立理解的知识卡片。",
    "每张卡片尽量只聚焦一个清晰、完整的知识点。",
    "每张卡片要是可以独立阅读并理解的内容。",
    "尽量将给定内容中的核心表述都覆盖到生成的卡片当中",
    "content 字段必须写成完整、可直接阅读的知识表述，而不是原文摘抄碎片。",
    "如果存在代词、省略主语或指代不清的表达，请优先结合上下文补全。",
    "如果内容不包含有效知识，请返回 0 张卡片。",
    "标题必须使用简洁中文，尽量控制在 8 到 28 个字之间。",
    "内容尽量控制在 80 到 400 个中文字符之间，但要以表达完整为优先。",
    "每张卡片返回 1 到 5 个高质量标签，避免空泛标签。",
    "优先保证每张卡片都足够内聚，避免把多个松散知识点混在同一张卡片里。",
    "对于消息来源，优先提炼明确结论、建议、风险、纠正和可执行经验。",
]


def build_card_extraction_prompt(*, source_name: str, chunk: RuntimeChunk) -> str:
    context_parts = [
        f"来源名称：{source_name}",
        f"来源类型：{chunk.source_type}",
    ]
    if chunk.current_heading:
        context_parts.append(f"当前标题：{chunk.current_heading}")
    if chunk.parent_heading:
        context_parts.append(f"父级标题：{chunk.parent_heading}")
    if chunk.question_text:
        context_parts.append(f"当前问题：{chunk.question_text}")
    if chunk.previous_text:
        context_parts.append(
            "前文上下文（仅用于代词消解和补全主语，不要机械复制原文）：\n"
            f"{chunk.previous_text.strip()}"
        )

    extraction_target = chunk.text.strip()
    if chunk.question_text or chunk.answer_text:
        extraction_target = (
            f"问题：{(chunk.question_text or '').strip()}\n"
            f"回答：{(chunk.answer_text or '').strip()}"
        ).strip()

    return (
        "\n".join(_CARD_EXTRACTION_INSTRUCTIONS)
        + "\n\n"
        + "\n".join(context_parts)
        + "\n\n待处理内容：\n"
        + extraction_target
    )
