from __future__ import annotations

from difflib import SequenceMatcher
import hashlib
import math
import re
from app.services.knowledge_ingestion.types import ExtractedCardDraft, GeneratedKnowledgeCard


class CardQualityService:
    def refine_cards(self, cards: list[ExtractedCardDraft]) -> list[ExtractedCardDraft]:
        normalized_cards = [self._normalize_card(card) for card in cards]
        filtered_cards = [card for card in normalized_cards if self._passes_filters(card)]
        deduped_cards = self._exact_dedupe(filtered_cards)
        return self._near_dedupe(deduped_cards)

    def from_generated(
        self,
        *,
        source_chunk_id: str,
        cards: list[GeneratedKnowledgeCard],
    ) -> list[ExtractedCardDraft]:
        return [
            ExtractedCardDraft(
                title=card.title.strip(),
                content=card.content.strip(),
                tags=[tag.strip() for tag in card.tags if tag.strip()][:5],
                source_chunk_id=source_chunk_id,
            )
            for card in cards
        ]

    def _normalize_card(self, card: ExtractedCardDraft) -> ExtractedCardDraft:
        title = re.sub(r"\s+", " ", card.title.strip())
        content = re.sub(r"\n{3,}", "\n\n", card.content.strip())
        tags = self._normalize_tags(card.tags)
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        return ExtractedCardDraft(
            title=title,
            content=content,
            tags=tags,
            source_chunk_id=card.source_chunk_id,
            content_hash=content_hash,
            embedding=card.embedding,
        )

    def _passes_filters(self, card: ExtractedCardDraft) -> bool:
        content = card.content.strip()
        title = card.title.strip()
        if not title or not content:
            return False
        if len(content) < 10:
            return False
        if self._contains_unresolved_pronoun(content):
            return False
        if title in {"总结", "说明", "补充", "笔记"} and len(content) < 80:
            return False
        return True

    def _exact_dedupe(self, cards: list[ExtractedCardDraft]) -> list[ExtractedCardDraft]:
        best_by_hash: dict[str, ExtractedCardDraft] = {}
        for card in cards:
            assert card.content_hash is not None
            existing = best_by_hash.get(card.content_hash)
            if existing is None or self._card_strength(card) > self._card_strength(existing):
                best_by_hash[card.content_hash] = card
        return list(best_by_hash.values())

    def _near_dedupe(self, cards: list[ExtractedCardDraft]) -> list[ExtractedCardDraft]:
        if not cards:
            return []

        from app.services.card_generation_service import get_embedding_service

        embedding_service = get_embedding_service()
        ordered_cards: list[ExtractedCardDraft] = []
        for card in cards:
            embedding = card.embedding or embedding_service.embed_content(card.content)
            current = card.model_copy(update={"embedding": embedding})
            duplicate_index: int | None = None
            for index, existing in enumerate(ordered_cards):
                if existing.embedding is None:
                    continue
                if (
                    self._cosine_similarity(existing.embedding, embedding) >= 0.92
                    and self._text_similarity(existing.content, current.content) >= 0.98
                ):
                    duplicate_index = index
                    break
            if duplicate_index is None:
                ordered_cards.append(current)
            else:
                existing = ordered_cards[duplicate_index]
                if self._card_strength(current) > self._card_strength(existing):
                    ordered_cards[duplicate_index] = current
        return ordered_cards

    @staticmethod
    def _normalize_tags(tags: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        aliases = {
            "fast api": "FastAPI",
            "pg vector": "pgvector",
            "rag检索": "RAG",
        }
        for tag in tags:
            compact = re.sub(r"\s+", " ", tag.strip())
            if not compact:
                continue
            compact = aliases.get(compact.lower(), compact)
            dedupe_key = compact.lower()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            normalized.append(compact)
            if len(normalized) >= 5:
                break
        return normalized

    @staticmethod
    def _contains_unresolved_pronoun(text: str) -> bool:
        return bool(re.search(r"(^|[，。；、\s])(它|前者|后者|这样|该方法|这种方式)([，。；、\s]|$)", text))

    @staticmethod
    def _card_strength(card: ExtractedCardDraft) -> float:
        length_score = min(len(card.content), 320) / 100
        tag_score = len(card.tags) * 0.2
        title_score = 1 if card.title not in {"总结", "说明", "补充", "笔记"} else 0
        return length_score + tag_score + title_score

    @staticmethod
    def _cosine_similarity(left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        numerator = sum(a * b for a, b in zip(left, right, strict=False))
        left_norm = math.sqrt(sum(a * a for a in left))
        right_norm = math.sqrt(sum(b * b for b in right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return numerator / (left_norm * right_norm)

    @staticmethod
    def _text_similarity(left: str, right: str) -> float:
        return SequenceMatcher(a=left.strip(), b=right.strip()).ratio()


_service: CardQualityService | None = None


def get_card_quality_service() -> CardQualityService:
    global _service
    if _service is None:
        _service = CardQualityService()
    return _service
