from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models.card import KnowledgeCard
from app.models.knowledge_source import KnowledgeSource
from app.services.card_generation_service import process_knowledge_source_sync
from app.services.retrieval_service import RetrievalService
from evals.llm_service import CardSummary, get_evaluation_llm_service
from evals.metrics import hard_negative_hit_rate_at_k, recall_at_k, reciprocal_rank
from evals.models import (
    CardGenerationEvalSample,
    CardGenerationEvaluationReport,
    CardGenerationSampleResult,
    RetrievalEvaluationReport,
    RetrievalEvalSample,
    RetrievalSampleResult,
    RetrievalStageSummary,
)
from evals.source_loader import sync_sources_from_directory


def _accepted_like_count(review_statuses: list[str]) -> int:
    return sum(1 for status in review_statuses if status in {"accepted", "corrected"})


class CardGenerationEvaluator:
    def evaluate(
        self,
        *,
        user_id: str,
        dataset_path: Path,
        samples: list[CardGenerationEvalSample],
        reprocess: bool = False,
    ) -> CardGenerationEvaluationReport:
        if reprocess:
            for sample in samples:
                process_knowledge_source_sync(sample.source_id)

        llm_service = get_evaluation_llm_service()
        results: list[CardGenerationSampleResult] = []
        for sample in samples:
            db = SessionLocal()
            try:
                source = _resolve_source_for_eval(db=db, user_id=user_id, sample=sample)
                cards = (
                    db.execute(
                        select(KnowledgeCard)
                        .where(
                            KnowledgeCard.user_id == user_id,
                            KnowledgeCard.source_id == sample.source_id,
                        )
                        .order_by(KnowledgeCard.updated_at.desc())
                    )
                    .scalars()
                    .all()
                )
            finally:
                db.close()

            summaries = [
                CardSummary(
                    card_id=card.id,
                    title=card.title,
                    content=card.content,
                    tags=card.tags or [],
                )
                for card in cards
            ]
            duplicate_count = _duplicate_card_count(cards)
            covered_indexes = (
                llm_service.judge_expected_point_coverage(
                    expected_points=sample.expected_points,
                    cards=summaries,
                )
                if sample.expected_points and summaries
                else []
            )
            covered_points = [sample.expected_points[index - 1] for index in covered_indexes]
            missed_points = [
                point
                for index, point in enumerate(sample.expected_points, start=1)
                if index not in covered_indexes
            ]
            expected_count = len(sample.expected_points)
            coverage_ratio = (len(covered_points) / expected_count) if expected_count else 0.0

            results.append(
                CardGenerationSampleResult(
                    source_id=sample.source_id,
                    source_name=source.name,
                    source_status=source.status,
                    card_count=len(cards),
                    duplicate_card_count=duplicate_count,
                    empty_result=not cards,
                    expected_point_count=expected_count,
                    covered_point_count=len(covered_points),
                    coverage_ratio=coverage_ratio,
                    covered_points=covered_points,
                    missed_points=missed_points,
                    review_status=sample.review_status,
                    card_ids=[card.id for card in cards],
                )
            )

        sample_count = len(results)
        return CardGenerationEvaluationReport(
            generated_at=datetime.now(timezone.utc),
            dataset_path=str(dataset_path),
            sample_count=sample_count,
            accepted_like_sample_count=_accepted_like_count([item.review_status for item in samples]),
            source_failure_count=sum(1 for item in results if item.source_status == "failed"),
            empty_result_count=sum(1 for item in results if item.empty_result),
            average_card_count=(sum(item.card_count for item in results) / sample_count) if sample_count else 0.0,
            average_duplicate_card_count=(
                sum(item.duplicate_card_count for item in results) / sample_count
            )
            if sample_count
            else 0.0,
            average_coverage_ratio=(
                sum(item.coverage_ratio for item in results) / sample_count
            )
            if sample_count
            else 0.0,
            samples=results,
        )


class RetrievalEvaluator:
    def __init__(self) -> None:
        self._service = RetrievalService()

    def evaluate(
        self,
        *,
        user_id: str,
        dataset_path: Path,
        samples: list[RetrievalEvalSample],
        limit: int = 5,
    ) -> RetrievalEvaluationReport:
        db = SessionLocal()
        results: list[RetrievalSampleResult] = []
        try:
            user_cards = (
                db.execute(
                    select(KnowledgeCard).where(
                        KnowledgeCard.user_id == user_id,
                        KnowledgeCard.status == "active",
                    )
                )
                .scalars()
                .all()
            )
            cards_by_id = {card.id: card for card in user_cards}
            cards_by_hash = {
                card.content_hash: card
                for card in user_cards
                if card.content_hash
            }
            for sample in samples:
                dense = self._service._dense_recall(db, user_id=user_id, query=sample.query, limit=max(limit * 4, 10))
                sparse = self._service._sparse_recall(
                    db,
                    user_id=user_id,
                    query=sample.query,
                    limit=max(limit * 4, 10),
                )
                fused = self._service._fuse_rrf(dense, sparse)
                reranked = self._service._rerank_candidates(query=sample.query, candidates=fused, limit=limit)
                effective_gold_ids = _resolve_effective_gold_card_ids(
                    sample=sample,
                    cards_by_id=cards_by_id,
                    cards_by_hash=cards_by_hash,
                )
                results.append(
                    RetrievalSampleResult(
                        query=sample.query,
                        query_type=sample.query_type,
                        review_status=sample.review_status,
                        gold_card_ids=effective_gold_ids,
                        dense_top_ids=[item.card.id for item in dense[:limit]],
                        sparse_top_ids=[item.card.id for item in sparse[:limit]],
                        fused_top_ids=[item.card.id for item in fused[:limit]],
                        rerank_top_ids=[item.card.id for item in reranked[:limit]],
                    )
                )
        finally:
            db.close()

        summaries = [
            _summarize_retrieval_stage(stage_name, results)
            for stage_name in ("dense", "sparse", "fused", "rerank")
        ]
        return RetrievalEvaluationReport(
            generated_at=datetime.now(timezone.utc),
            dataset_path=str(dataset_path),
            sample_count=len(results),
            accepted_like_sample_count=_accepted_like_count([item.review_status for item in samples]),
            stage_summaries=summaries,
            samples=results,
        )


def _duplicate_card_count(cards: list[KnowledgeCard]) -> int:
    seen: set[str] = set()
    duplicates = 0
    for card in cards:
        key = card.content_hash or _normalize_card_key(card.title, card.content)
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
    return duplicates


def _normalize_card_key(title: str, content: str) -> str:
    normalized_title = " ".join(title.strip().split()).lower()
    normalized_content = " ".join(content.strip().split()).lower()
    return f"{normalized_title}::{normalized_content}"


def _stage_top_ids(result: RetrievalSampleResult, stage_name: str) -> list[str]:
    mapping = {
        "dense": result.dense_top_ids,
        "sparse": result.sparse_top_ids,
        "fused": result.fused_top_ids,
        "rerank": result.rerank_top_ids,
    }
    return mapping[stage_name]


def _summarize_retrieval_stage(stage_name: str, results: list[RetrievalSampleResult]) -> RetrievalStageSummary:
    positive_samples = [item for item in results if item.gold_card_ids]
    negative_samples = [item for item in results if not item.gold_card_ids]

    def _average(values: list[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    recall_1 = _average([
        recall_at_k(_stage_top_ids(item, stage_name), set(item.gold_card_ids), 1)
        for item in positive_samples
    ])
    recall_3 = _average([
        recall_at_k(_stage_top_ids(item, stage_name), set(item.gold_card_ids), 3)
        for item in positive_samples
    ])
    recall_5 = _average([
        recall_at_k(_stage_top_ids(item, stage_name), set(item.gold_card_ids), 5)
        for item in positive_samples
    ])
    mrr = _average([
        reciprocal_rank(_stage_top_ids(item, stage_name), set(item.gold_card_ids))
        for item in positive_samples
    ])
    hard_negative_1 = _average([
        hard_negative_hit_rate_at_k(_stage_top_ids(item, stage_name), 1)
        for item in negative_samples
    ])
    hard_negative_3 = _average([
        hard_negative_hit_rate_at_k(_stage_top_ids(item, stage_name), 3)
        for item in negative_samples
    ])
    hard_negative_5 = _average([
        hard_negative_hit_rate_at_k(_stage_top_ids(item, stage_name), 5)
        for item in negative_samples
    ])

    return RetrievalStageSummary(
        stage=stage_name,
        sample_count=len(results),
        positive_sample_count=len(positive_samples),
        hard_negative_sample_count=len(negative_samples),
        recall_at_1=recall_1,
        recall_at_3=recall_3,
        recall_at_5=recall_5,
        mrr=mrr,
        hard_negative_hit_rate_at_1=hard_negative_1,
        hard_negative_hit_rate_at_3=hard_negative_3,
        hard_negative_hit_rate_at_5=hard_negative_5,
    )


def synthesize_card_generation_samples(
    *,
    source_dir: Path,
    eval_user_email: str | None = None,
) -> list[CardGenerationEvalSample]:
    sync_result = sync_sources_from_directory(
        source_dir=source_dir,
        user_email=eval_user_email,
        process_sources=True,
        activate_cards=True,
    )
    user_id = sync_result.user_id
    source_ids = [item.source_id for item in sync_result.sources]

    llm_service = get_evaluation_llm_service()
    db = SessionLocal()
    try:
        sources = (
            db.execute(
                select(KnowledgeSource).where(
                    KnowledgeSource.user_id == user_id,
                    KnowledgeSource.id.in_(source_ids),
                )
            )
            .scalars()
            .all()
        )
    finally:
        db.close()

    source_map = {source.id: source for source in sources}
    samples: list[CardGenerationEvalSample] = []
    for source_id in source_ids:
        source = source_map.get(source_id)
        if source is None:
            raise RuntimeError(f"Knowledge source not found: {source_id}")
        expected_points = llm_service.synthesize_expected_points(
            source_name=source.name,
            source_type=source.source_type,
            input_text=source.raw_content,
        )
        samples.append(
            CardGenerationEvalSample(
                source_id=source.id,
                source_type=source.source_type,
                source_locator=str((source.source_metadata or {}).get("evalRelativePath") or ""),
                input_text=source.raw_content,
                source_name=source.name,
                expected_points=expected_points,
                review_status="pending",
            )
        )
    return samples


def synthesize_retrieval_samples(
    *,
    source_dir: Path,
    eval_user_email: str | None = None,
    hard_negative_count: int,
) -> list[RetrievalEvalSample]:
    sync_result = sync_sources_from_directory(
        source_dir=source_dir,
        user_email=eval_user_email,
        process_sources=True,
        activate_cards=True,
    )
    user_id = sync_result.user_id
    source_ids = [item.source_id for item in sync_result.sources]

    llm_service = get_evaluation_llm_service()
    db = SessionLocal()
    try:
        cards = (
            db.execute(
                select(KnowledgeCard)
                .where(
                    KnowledgeCard.user_id == user_id,
                    KnowledgeCard.source_id.in_(source_ids),
                    KnowledgeCard.status == "active",
                )
                .order_by(KnowledgeCard.source_id.asc(), KnowledgeCard.updated_at.desc())
            )
            .scalars()
            .all()
        )
    finally:
        db.close()

    grouped_cards: dict[str, list[KnowledgeCard]] = defaultdict(list)
    for card in cards:
        if card.source_id:
            grouped_cards[card.source_id].append(card)

    samples: list[RetrievalEvalSample] = []
    for source_id in source_ids:
        source_cards = grouped_cards.get(source_id, [])
        if not source_cards:
            raise RuntimeError(f"No active cards found for source: {source_id}")
        summaries = [
            CardSummary(
                card_id=card.id,
                title=card.title,
                content=card.content,
                tags=card.tags or [],
            )
            for card in source_cards
        ]
        before_count = len(samples)
        samples.extend(
            llm_service.synthesize_retrieval_samples(
                source_scope=source_id,
                cards=summaries,
                hard_negative_count=hard_negative_count,
            )
        )
        latest_batch = samples[before_count:]
        card_by_id = {card.id: card for card in source_cards}
        for sample in latest_batch:
            if sample.source_scope != source_id:
                continue
            sample.gold_card_content_hashes = [
                card_by_id[card_id].content_hash
                for card_id in sample.gold_card_ids
                if card_id in card_by_id and card_by_id[card_id].content_hash
            ]
    return samples


def sync_eval_sources_from_directory(*, source_dir: Path, eval_user_email: str | None = None) -> tuple[str, list[str]]:
    sync_result = sync_sources_from_directory(
        source_dir=source_dir,
        user_email=eval_user_email,
        process_sources=True,
        activate_cards=True,
    )
    return sync_result.user_id, [item.source_id for item in sync_result.sources]


def _resolve_effective_gold_card_ids(
    *,
    sample: RetrievalEvalSample,
    cards_by_id: dict[str, KnowledgeCard],
    cards_by_hash: dict[str, KnowledgeCard],
) -> list[str]:
    resolved_ids = [card_id for card_id in sample.gold_card_ids if card_id in cards_by_id]
    if resolved_ids:
        return resolved_ids
    return [
        cards_by_hash[content_hash].id
        for content_hash in sample.gold_card_content_hashes
        if content_hash in cards_by_hash
    ]


def _resolve_source_for_eval(
    *,
    db,
    user_id: str,
    sample: CardGenerationEvalSample,
) -> KnowledgeSource:
    source = db.execute(
        select(KnowledgeSource).where(
            KnowledgeSource.id == sample.source_id,
            KnowledgeSource.user_id == user_id,
        )
    ).scalar_one_or_none()
    if source is not None:
        return source

    if sample.source_locator:
        candidate_sources = (
            db.execute(
                select(KnowledgeSource).where(
                    KnowledgeSource.user_id == user_id,
                    KnowledgeSource.source_type == sample.source_type,
                )
            )
            .scalars()
            .all()
        )
        for candidate in candidate_sources:
            if str((candidate.source_metadata or {}).get("evalRelativePath") or "") == sample.source_locator:
                return candidate

    raise RuntimeError(
        f"Knowledge source not found for sample source_id={sample.source_id!r} locator={sample.source_locator!r}"
    )
