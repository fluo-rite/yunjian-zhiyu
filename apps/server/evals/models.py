from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ReviewStatus = Literal["pending", "accepted", "rejected", "corrected"]
RetrievalQueryType = Literal["direct", "paraphrase", "contextual", "hard_negative"]


class CardGenerationEvalSample(BaseModel):
    source_id: str
    source_type: str
    source_locator: str | None = None
    input_text: str | None = None
    source_name: str | None = None
    expected_points: list[str] = Field(default_factory=list)
    review_status: ReviewStatus = "pending"
    notes: str | None = None


class RetrievalEvalSample(BaseModel):
    query: str
    gold_card_ids: list[str] = Field(default_factory=list)
    gold_card_content_hashes: list[str] = Field(default_factory=list)
    query_type: RetrievalQueryType
    source_scope: str | None = None
    review_status: ReviewStatus = "pending"
    notes: str | None = None


class CardGenerationSampleResult(BaseModel):
    source_id: str
    source_name: str
    source_status: str
    card_count: int
    duplicate_card_count: int
    empty_result: bool
    expected_point_count: int
    covered_point_count: int
    coverage_ratio: float
    covered_points: list[str] = Field(default_factory=list)
    missed_points: list[str] = Field(default_factory=list)
    review_status: ReviewStatus
    card_ids: list[str] = Field(default_factory=list)


class RetrievalSampleResult(BaseModel):
    query: str
    query_type: RetrievalQueryType
    review_status: ReviewStatus
    gold_card_ids: list[str] = Field(default_factory=list)
    dense_top_ids: list[str] = Field(default_factory=list)
    sparse_top_ids: list[str] = Field(default_factory=list)
    fused_top_ids: list[str] = Field(default_factory=list)
    rerank_top_ids: list[str] = Field(default_factory=list)


class RetrievalStageSummary(BaseModel):
    stage: str
    sample_count: int
    positive_sample_count: int
    hard_negative_sample_count: int
    recall_at_1: float
    recall_at_3: float
    recall_at_5: float
    mrr: float
    hard_negative_hit_rate_at_1: float
    hard_negative_hit_rate_at_3: float
    hard_negative_hit_rate_at_5: float


class CardGenerationEvaluationReport(BaseModel):
    generated_at: datetime
    dataset_path: str
    sample_count: int
    accepted_like_sample_count: int
    source_failure_count: int
    empty_result_count: int
    average_card_count: float
    average_duplicate_card_count: float
    average_coverage_ratio: float
    samples: list[CardGenerationSampleResult]


class RetrievalEvaluationReport(BaseModel):
    generated_at: datetime
    dataset_path: str
    sample_count: int
    accepted_like_sample_count: int
    stage_summaries: list[RetrievalStageSummary]
    samples: list[RetrievalSampleResult]
