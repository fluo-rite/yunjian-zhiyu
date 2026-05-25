from pathlib import Path

from app.core.db import Base, SessionLocal, engine
from app.models.knowledge_source import KnowledgeSource
from evals.cli import build_parser
from evals.jsonl import load_jsonl, write_jsonl
from evals.metrics import hard_negative_hit_rate_at_k, recall_at_k, reciprocal_rank
from evals.models import CardGenerationEvalSample, RetrievalEvalSample, RetrievalSampleResult
from evals.runner import (
    _duplicate_card_count,
    _resolve_effective_gold_card_ids,
    _resolve_source_for_eval,
    _summarize_retrieval_stage,
)
from evals.source_loader import sync_sources_from_directory


def test_jsonl_round_trip(tmp_path: Path) -> None:
    path = tmp_path / "retrieval_eval.jsonl"
    items = [
        RetrievalEvalSample(
            query="FastAPI 如何组织路由？",
            gold_card_ids=["card-1"],
            query_type="direct",
            source_scope="source-1",
            review_status="pending",
        )
    ]
    write_jsonl(path, items)

    loaded = load_jsonl(path, RetrievalEvalSample)
    assert loaded == items


def test_retrieval_metrics_compute_expected_values() -> None:
    gold_ids = {"card-2"}
    retrieved = ["card-1", "card-2", "card-3"]

    assert recall_at_k(retrieved, gold_ids, 1) == 0.0
    assert recall_at_k(retrieved, gold_ids, 3) == 1.0
    assert reciprocal_rank(retrieved, gold_ids) == 0.5
    assert hard_negative_hit_rate_at_k([], 3) == 0.0
    assert hard_negative_hit_rate_at_k(["card-1"], 3) == 1.0


def test_duplicate_card_count_uses_content_hash_when_available() -> None:
    class FakeCard:
        def __init__(self, title: str, content: str, content_hash: str | None) -> None:
            self.title = title
            self.content = content
            self.content_hash = content_hash

    cards = [
        FakeCard("A", "one", "hash-1"),
        FakeCard("B", "two", "hash-2"),
        FakeCard("C", "three", "hash-1"),
    ]

    assert _duplicate_card_count(cards) == 1


def test_retrieval_stage_summary_tracks_positive_and_negative_samples() -> None:
    results = [
        RetrievalSampleResult(
            query="什么是 SSR？",
            query_type="direct",
            review_status="accepted",
            gold_card_ids=["card-1"],
            dense_top_ids=["card-1"],
            sparse_top_ids=["card-2"],
            fused_top_ids=["card-1"],
            rerank_top_ids=["card-1"],
        ),
        RetrievalSampleResult(
            query="秋季水果有哪些？",
            query_type="hard_negative",
            review_status="pending",
            gold_card_ids=[],
            dense_top_ids=["card-3"],
            sparse_top_ids=[],
            fused_top_ids=["card-3"],
            rerank_top_ids=[],
        ),
    ]

    summary = _summarize_retrieval_stage("rerank", results)
    assert summary.sample_count == 2
    assert summary.positive_sample_count == 1
    assert summary.hard_negative_sample_count == 1
    assert summary.recall_at_1 == 1.0
    assert summary.hard_negative_hit_rate_at_1 == 0.0


def test_card_generation_eval_sample_defaults() -> None:
    sample = CardGenerationEvalSample(source_id="source-1", source_type="document")
    assert sample.expected_points == []
    assert sample.review_status == "pending"


def test_sync_sources_from_directory_creates_eval_sources(tmp_path: Path) -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    source_dir = tmp_path / "sources"
    source_dir.mkdir()
    (source_dir / "fastapi.md").write_text("# FastAPI\n\nFastAPI 是一个用于构建 API 的 Python 框架。", encoding="utf-8")

    result = sync_sources_from_directory(
        source_dir=source_dir,
        user_email="eval-folder@example.local",
        process_sources=False,
        activate_cards=False,
    )

    assert len(result.sources) == 1
    db = SessionLocal()
    try:
        source = db.get(KnowledgeSource, result.sources[0].source_id)
        assert source is not None
        assert source.name == "fastapi"
        assert (source.source_metadata or {}).get("evalRelativePath") == "fastapi.md"
    finally:
        db.close()


def test_resolve_effective_gold_card_ids_falls_back_to_content_hash() -> None:
    class FakeCard:
        def __init__(self, card_id: str, content_hash: str | None) -> None:
            self.id = card_id
            self.content_hash = content_hash

    sample = RetrievalEvalSample(
        query="什么是 SSR？",
        gold_card_ids=["missing-card"],
        gold_card_content_hashes=["hash-1"],
        query_type="direct",
    )
    resolved = _resolve_effective_gold_card_ids(
        sample=sample,
        cards_by_id={},
        cards_by_hash={"hash-1": FakeCard("card-current", "hash-1")},
    )
    assert resolved == ["card-current"]


def test_resolve_source_for_eval_uses_locator_when_source_id_is_stale() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        source = KnowledgeSource(
            user_id="user-1",
            name="routing",
            source_type="document",
            raw_content="FastAPI 路由说明",
            status="ready",
            source_metadata={"evalRelativePath": "routing.md"},
        )
        db.add(source)
        db.commit()

        sample = CardGenerationEvalSample(
            source_id="old-source-id",
            source_type="document",
            source_locator="routing.md",
        )
        resolved = _resolve_source_for_eval(db=db, user_id="user-1", sample=sample)
        assert resolved.id == source.id
    finally:
        db.close()


def test_eval_cli_only_exposes_source_dir_mode() -> None:
    parser = build_parser()
    synthesize_parser = parser._subparsers._group_actions[0].choices["synthesize-card-generation"]
    retrieval_parser = parser._subparsers._group_actions[0].choices["synthesize-retrieval"]
    eval_card_parser = parser._subparsers._group_actions[0].choices["evaluate-card-generation"]

    synthesize_help = synthesize_parser.format_help()
    retrieval_help = retrieval_parser.format_help()
    eval_card_help = eval_card_parser.format_help()

    assert "--user-id" not in synthesize_help
    assert "--source-ids" not in synthesize_help
    assert "--source-dir" in synthesize_help

    assert "--user-id" not in retrieval_help
    assert "--source-ids" not in retrieval_help
    assert "--source-dir" in retrieval_help

    assert "--user-id" not in eval_card_help
    assert "--source-dir" in eval_card_help
