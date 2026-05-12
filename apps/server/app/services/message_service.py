import re
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import utc_now
from app.models.card import KnowledgeCard
from app.models.chat import Chat
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate, MessageCreateResponse, MessageRead
from app.services.llm_service import LLMService


class MessageService:
    @staticmethod
    def create(
        db: Session,
        user: User,
        chat: Chat,
        payload: MessageCreate,
    ) -> MessageCreateResponse:
        started_at = time.perf_counter()
        user_message = Message(
            chat_id=chat.id,
            role="user",
            content=payload.content.strip(),
            message_metadata={
                "requestedUseKnowledge": payload.options.use_knowledge,
                "requestedUseWebSearch": payload.options.use_web_search,
            },
        )
        db.add(user_message)

        knowledge_cards = MessageService._find_relevant_cards(
            db,
            user,
            payload.content,
            enabled=payload.options.use_knowledge,
        )
        generated = LLMService.generate_reply(
            prompt=payload.content.strip(),
            knowledge_cards=knowledge_cards,
            use_knowledge=payload.options.use_knowledge,
            use_web_search=payload.options.use_web_search,
        )
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        citations_payload = [
            citation.model_dump(by_alias=True, exclude_none=True) for citation in generated.citations
        ]
        assistant_message = Message(
            chat_id=chat.id,
            role="assistant",
            content=generated.content,
            message_metadata={
                "usedKnowledge": generated.used_knowledge,
                "usedWebSearch": generated.used_web_search,
                "model": generated.model,
                "latencyMs": latency_ms,
                "citations": citations_payload,
            },
        )
        db.add(assistant_message)
        chat.updated_at = utc_now()
        db.add(chat)
        db.commit()
        db.refresh(assistant_message)

        return MessageCreateResponse(
            message=MessageService.to_read(assistant_message),
            citations=generated.citations,
        )

    @staticmethod
    def to_read(message: Message) -> MessageRead:
        return MessageRead(
            id=message.id,
            chat_id=message.chat_id,
            role=message.role,
            content=message.content,
            metadata=message.message_metadata,
            created_at=message.created_at,
        )

    @staticmethod
    def _find_relevant_cards(
        db: Session,
        user: User,
        prompt: str,
        *,
        enabled: bool,
    ) -> list[KnowledgeCard]:
        if not enabled:
            return []

        cards = (
            db.execute(
                select(KnowledgeCard).where(
                    KnowledgeCard.user_id == user.id,
                    KnowledgeCard.status == "active",
                )
            )
            .scalars()
            .all()
        )
        if not cards:
            return []

        keywords = {
            keyword.lower()
            for keyword in re.findall(r"\w+", prompt, flags=re.UNICODE)
            if len(keyword.strip()) >= 2
        }
        scored_cards: list[tuple[int, KnowledgeCard]] = []
        for card in cards:
            haystack_title = card.title.lower()
            haystack_summary = (card.summary or "").lower()
            haystack_content = card.content.lower()
            score = 0
            for keyword in keywords:
                if keyword in haystack_title:
                    score += 3
                if keyword in haystack_summary:
                    score += 2
                if keyword in haystack_content:
                    score += 1
            if score > 0:
                scored_cards.append((score, card))

        scored_cards.sort(key=lambda item: (item[0], item[1].updated_at), reverse=True)
        return [card for _, card in scored_cards[:3]]
