from __future__ import annotations

import argparse
from pathlib import Path
import sys


SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from evals.jsonl import load_jsonl, write_json, write_jsonl  # noqa: E402
from evals.models import CardGenerationEvalSample, RetrievalEvalSample  # noqa: E402
from evals.runner import (  # noqa: E402
    CardGenerationEvaluator,
    RetrievalEvaluator,
    synthesize_card_generation_samples,
    synthesize_retrieval_samples,
    sync_eval_sources_from_directory,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Lightweight evaluation toolkit for cards and retrieval.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    synthesize_card = subparsers.add_parser("synthesize-card-generation")
    synthesize_card.add_argument("--source-dir", required=True)
    synthesize_card.add_argument("--eval-user-email", default="evals@example.local")
    synthesize_card.add_argument("--output", required=True)

    synthesize_retrieval = subparsers.add_parser("synthesize-retrieval")
    synthesize_retrieval.add_argument("--source-dir", required=True)
    synthesize_retrieval.add_argument("--eval-user-email", default="evals@example.local")
    synthesize_retrieval.add_argument("--hard-negative-count", type=int, default=2)
    synthesize_retrieval.add_argument("--output", required=True)

    sync_dir = subparsers.add_parser("sync-source-dir")
    sync_dir.add_argument("--source-dir", required=True)
    sync_dir.add_argument("--eval-user-email", default="evals@example.local")

    eval_card = subparsers.add_parser("evaluate-card-generation")
    eval_card.add_argument("--source-dir", required=True)
    eval_card.add_argument("--dataset", required=True)
    eval_card.add_argument("--output", required=True)
    eval_card.add_argument("--reprocess", action="store_true")
    eval_card.add_argument("--eval-user-email", default="evals@example.local")

    eval_retrieval = subparsers.add_parser("evaluate-retrieval")
    eval_retrieval.add_argument("--source-dir", required=True)
    eval_retrieval.add_argument("--dataset", required=True)
    eval_retrieval.add_argument("--output", required=True)
    eval_retrieval.add_argument("--limit", type=int, default=5)
    eval_retrieval.add_argument("--eval-user-email", default="evals@example.local")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "sync-source-dir":
        user_id, source_ids = sync_eval_sources_from_directory(
            source_dir=Path(args.source_dir),
            eval_user_email=args.eval_user_email,
        )
        print(f"Synced {len(source_ids)} sources for eval user {args.eval_user_email} (user_id={user_id})")
        return 0

    if args.command == "synthesize-card-generation":
        items = synthesize_card_generation_samples(
            source_dir=Path(args.source_dir),
            eval_user_email=args.eval_user_email,
        )
        write_jsonl(Path(args.output), items)
        print(f"Wrote {len(items)} card-generation eval samples to {args.output}")
        return 0

    if args.command == "synthesize-retrieval":
        items = synthesize_retrieval_samples(
            source_dir=Path(args.source_dir),
            eval_user_email=args.eval_user_email,
            hard_negative_count=args.hard_negative_count,
        )
        write_jsonl(Path(args.output), items)
        print(f"Wrote {len(items)} retrieval eval samples to {args.output}")
        return 0

    if args.command == "evaluate-card-generation":
        user_id, _ = sync_eval_sources_from_directory(
            source_dir=Path(args.source_dir),
            eval_user_email=args.eval_user_email,
        )
        dataset_path = Path(args.dataset)
        samples = load_jsonl(dataset_path, CardGenerationEvalSample)
        report = CardGenerationEvaluator().evaluate(
            user_id=user_id,
            dataset_path=dataset_path,
            samples=samples,
            reprocess=args.reprocess,
        )
        write_json(Path(args.output), report)
        print(f"Wrote card-generation evaluation report to {args.output}")
        return 0

    if args.command == "evaluate-retrieval":
        user_id, _ = sync_eval_sources_from_directory(
            source_dir=Path(args.source_dir),
            eval_user_email=args.eval_user_email,
        )
        dataset_path = Path(args.dataset)
        samples = load_jsonl(dataset_path, RetrievalEvalSample)
        report = RetrievalEvaluator().evaluate(
            user_id=user_id,
            dataset_path=dataset_path,
            samples=samples,
            limit=args.limit,
        )
        write_json(Path(args.output), report)
        print(f"Wrote retrieval evaluation report to {args.output}")
        return 0

    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
