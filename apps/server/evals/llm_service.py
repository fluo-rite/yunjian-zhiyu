from __future__ import annotations

from functools import lru_cache
import textwrap

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.core.config import get_settings
from evals.models import RetrievalEvalSample


class EvaluationConfigurationError(RuntimeError):
    pass


class ExpectedPointBatch(BaseModel):
    expected_points: list[str] = Field(default_factory=list, max_length=12)


class RetrievalEvalDraft(BaseModel):
    query: str = Field(min_length=1)
    gold_card_ids: list[str] = Field(default_factory=list)
    query_type: str = Field(min_length=1)


class RetrievalEvalDraftBatch(BaseModel):
    items: list[RetrievalEvalDraft] = Field(default_factory=list, max_length=50)


class CoverageJudgement(BaseModel):
    covered_point_indices: list[int] = Field(default_factory=list)


class CardSummary(BaseModel):
    card_id: str
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)


class EvaluationLlmService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.llm_base_url or not settings.llm_api_key or not settings.llm_model:
            raise EvaluationConfigurationError("LLM is not configured.")

        model = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout_seconds,
            temperature=0,
            max_retries=2,
        )
        self._expected_points_model = model.with_structured_output(ExpectedPointBatch)
        self._retrieval_dataset_model = model.with_structured_output(RetrievalEvalDraftBatch)
        self._coverage_model = model.with_structured_output(CoverageJudgement)

    def synthesize_expected_points(
        self,
        *,
        source_name: str,
        source_type: str,
        input_text: str,
    ) -> list[str]:
        prompt = textwrap.dedent(
            f"""
            你正在为中文知识沉淀系统生成“卡片生成评测样本”。

            任务：
            1. 阅读下面的原始资料
            2. 提取 4-8 条“这份资料的核心知识点”
            3. 这些知识点稍后会被用来和系统生成的知识卡片做覆盖率对照

            要求：
            - 只提炼真正重要的知识点，不要写琐碎细节
            - 每条知识点都要能独立表达，不要只写关键词
            - 使用中文
            - 不要输出重复点
            - 不要输出 JSON 之外的任何解释

            资料名称：{source_name}
            资料类型：{source_type}

            原始资料：
            {input_text}
            """
        ).strip()
        response = self._expected_points_model.invoke(prompt)
        return [item.strip() for item in response.expected_points if item.strip()]

    def synthesize_retrieval_samples(
        self,
        *,
        source_scope: str,
        cards: list[CardSummary],
        hard_negative_count: int,
    ) -> list[RetrievalEvalSample]:
        prompt_cards = "\n\n".join(
            textwrap.dedent(
                f"""
                卡片ID：{card.card_id}
                标题：{card.title}
                标签：{", ".join(card.tags) if card.tags else "无"}
                内容：{card.content}
                """
            ).strip()
            for card in cards
        )
        prompt = textwrap.dedent(
            f"""
            你正在为中文 RAG 检索系统生成“检索评测样本”。

            任务：
            1. 基于下面的知识卡片，生成适合中文用户的检索问题
            2. 生成的样本要覆盖三类正样本：
               - direct：直接问法
               - paraphrase：同义改写问法
               - contextual：依赖上下文的问法，例如“它的原理是什么”
            3. 还要生成 {hard_negative_count} 条 hard_negative：
               - 看起来像合理问题
               - 但不应该命中下面任何卡片
               - 其 gold_card_ids 必须为空数组

            要求：
            - 使用中文
            - 问法自然，像真实用户问题
            - 不要直接大段照抄卡片原文
            - 正样本的 gold_card_ids 必须只包含真正应该命中的卡片 ID
            - 同一个问题不要重复
            - 只输出结构化结果，不要额外解释

            来源范围：{source_scope}

            候选知识卡片：
            {prompt_cards}
            """
        ).strip()
        response = self._retrieval_dataset_model.invoke(prompt)
        samples: list[RetrievalEvalSample] = []
        for item in response.items:
            query_type = item.query_type.strip().lower()
            if query_type not in {"direct", "paraphrase", "contextual", "hard_negative"}:
                continue
            samples.append(
                RetrievalEvalSample(
                    query=item.query.strip(),
                    gold_card_ids=[card_id.strip() for card_id in item.gold_card_ids if card_id.strip()],
                    query_type=query_type,  # type: ignore[arg-type]
                    source_scope=source_scope,
                    review_status="pending",
                )
            )
        return samples

    def judge_expected_point_coverage(
        self,
        *,
        expected_points: list[str],
        cards: list[CardSummary],
    ) -> list[int]:
        prompt_cards = "\n\n".join(
            textwrap.dedent(
                f"""
                标题：{card.title}
                标签：{", ".join(card.tags) if card.tags else "无"}
                内容：{card.content}
                """
            ).strip()
            for card in cards
        )
        numbered_points = "\n".join(f"{index}. {point}" for index, point in enumerate(expected_points, start=1))
        prompt = textwrap.dedent(
            f"""
            你正在做“卡片生成覆盖率评估”。

            请判断下面“期望知识点清单”中，哪些知识点已经被“系统生成的知识卡片”有效覆盖。

            判定标准：
            - 只要卡片中已经明确表达出该知识点的主要含义，就算覆盖
            - 不要求逐字一致
            - 不要因为只有零散关键词就判定为已覆盖
            - 只返回已覆盖知识点的序号列表
            - 不要输出任何解释

            期望知识点：
            {numbered_points}

            系统生成的知识卡片：
            {prompt_cards}
            """
        ).strip()
        response = self._coverage_model.invoke(prompt)
        indexes = sorted({item for item in response.covered_point_indices if 1 <= item <= len(expected_points)})
        return indexes


@lru_cache
def get_evaluation_llm_service() -> EvaluationLlmService:
    return EvaluationLlmService()

