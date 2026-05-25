from __future__ import annotations

from collections.abc import Sequence


def recall_at_k(retrieved_ids: Sequence[str], gold_ids: set[str], k: int) -> float:
    if not gold_ids:
        return 0.0
    top_ids = set(retrieved_ids[:k])
    return len(top_ids & gold_ids) / len(gold_ids)


def reciprocal_rank(retrieved_ids: Sequence[str], gold_ids: set[str]) -> float:
    if not gold_ids:
        return 0.0
    for index, card_id in enumerate(retrieved_ids, start=1):
        if card_id in gold_ids:
            return 1.0 / index
    return 0.0


def hard_negative_hit_rate_at_k(retrieved_ids: Sequence[str], k: int) -> float:
    return 1.0 if retrieved_ids[:k] else 0.0

