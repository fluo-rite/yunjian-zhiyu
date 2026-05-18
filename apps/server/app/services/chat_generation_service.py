from __future__ import annotations

import time
from dataclasses import asdict, dataclass
from functools import lru_cache

from arq.connections import RedisSettings, create_pool
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.agents.chat_agent.agent import ChatAgentConfigurationError
from app.agents.chat_agent.runtime import get_chat_agent
from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models.chat import Chat
from app.models.message import Message
from app.schemas.message import CitationRead, MessageRead
from app.services.message_service import MessageService
from app.services.stream_adapter_service import StreamAdapterService
from app.services.stream_store_service import (
    build_abort_key,
    build_stream_key,
    get_stream_store,
)


@dataclass(slots=True)
class ChatGenerationJob:
    chat_id: str
    user_id: str
    user_message_id: str
    assistant_message_id: str
    use_knowledge: bool
    use_web_search: bool


class ChatTaskDispatcher:
    async def enqueue_generation(self, job: ChatGenerationJob) -> None:
        raise NotImplementedError


class ArqTaskDispatcher(ChatTaskDispatcher):
    async def enqueue_generation(self, job: ChatGenerationJob) -> None:
        settings = get_settings()
        redis_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
        try:
            await redis_pool.enqueue_job(
                "run_chat_generation_job",
                job=asdict(job),
                _queue_name=settings.arq_queue_name,
            )
        finally:
            await redis_pool.close()


@lru_cache
def get_chat_task_dispatcher() -> ChatTaskDispatcher:
    return ArqTaskDispatcher()


async def run_chat_generation(job: ChatGenerationJob) -> None:
    settings = get_settings()
    stream_store = get_stream_store()
    stream_key = build_stream_key(job.chat_id, job.assistant_message_id)
    abort_key = build_abort_key(job.chat_id, job.assistant_message_id)
    db = SessionLocal()

    try:
        state = _load_generation_state(db, job)
        start_event = StreamAdapterService.build_start_event(
            chat_id=job.chat_id,
            assistant_message_id=job.assistant_message_id,
        )
        await stream_store.append_event(
            stream_key,
            **StreamAdapterService.to_redis_record(start_event),
        )

        started_at = time.perf_counter()
        completion_payload: dict | None = None

        try:
            agent = get_chat_agent()
        except ChatAgentConfigurationError as error:
            await _finalize_failed(
                db,
                stream_key=stream_key,
                chat_id=job.chat_id,
                assistant_message_id=job.assistant_message_id,
                error_message=str(error),
                ttl_seconds=settings.stream_ttl_seconds,
            )
            return

        async for raw_event in agent.reply(
            user_id=job.user_id,
            user_message=state.user_message.content,
            pre_messages=state.pre_messages,
            use_knowledge=job.use_knowledge,
            use_web_search=job.use_web_search,
        ):
            if await stream_store.has_abort_flag(abort_key):
                await _finalize_aborted(
                    db,
                    stream_key=stream_key,
                    assistant_message=state.assistant_message,
                    ttl_seconds=settings.stream_ttl_seconds,
                )
                return

            adapted = StreamAdapterService.adapt_graph_chunk(
                chat_id=job.chat_id,
                assistant_message_id=job.assistant_message_id,
                event=raw_event,
            )
            if adapted is not None:
                await stream_store.append_event(
                    stream_key,
                    **StreamAdapterService.to_redis_record(adapted),
                )
                continue

            if raw_event["type"] == "message_complete":
                completion_payload = {
                    "content": raw_event["content"],
                    "citations": raw_event["citations"],
                    "used_knowledge": raw_event["used_knowledge"],
                    "used_web_search": raw_event["used_web_search"],
                }
                break

            if raw_event["type"] == "error":
                raise RuntimeError(raw_event["message"])

        if await stream_store.has_abort_flag(abort_key):
            await _finalize_aborted(
                db,
                stream_key=stream_key,
                assistant_message=state.assistant_message,
                ttl_seconds=settings.stream_ttl_seconds,
            )
            return

        if completion_payload is None:
            raise RuntimeError("Assistant generation completed without a final response.")

        latency_ms = int((time.perf_counter() - started_at) * 1000)
        await _finalize_done(
            db,
            stream_key=stream_key,
            assistant_message=state.assistant_message,
            citations=completion_payload["citations"],
            model=None,
            used_knowledge=completion_payload["used_knowledge"],
            used_web_search=completion_payload["used_web_search"],
            latency_ms=latency_ms,
            ttl_seconds=settings.stream_ttl_seconds,
        )
    except Exception as error:  # pragma: no cover - defensive outer guard
        await _finalize_failed(
            db,
            stream_key=stream_key,
            chat_id=job.chat_id,
            assistant_message_id=job.assistant_message_id,
            error_message=str(error),
            ttl_seconds=settings.stream_ttl_seconds,
        )
    finally:
        db.close()


async def run_chat_generation_job(ctx: dict, *, job: dict) -> None:  # pragma: no cover - ARQ entrypoint
    _ = ctx
    await run_chat_generation(ChatGenerationJob(**job))


@dataclass(slots=True)
class GenerationState:
    assistant_message: Message
    user_message: Message
    pre_messages: list[MessageRead]


def _load_generation_state(db: Session, job: ChatGenerationJob) -> GenerationState:
    chat = db.execute(
        select(Chat)
        .options(selectinload(Chat.messages))
        .where(Chat.id == job.chat_id, Chat.user_id == job.user_id)
    ).scalar_one()

    ordered_messages = sorted(chat.messages, key=lambda item: (item.created_at, item.id))
    pre_messages: list[MessageRead] = []
    user_message: Message | None = None
    assistant_message: Message | None = None

    for message in ordered_messages:
        if message.id == job.user_message_id:
            user_message = message
            continue
        if message.id == job.assistant_message_id:
            assistant_message = message
            continue
        if user_message is None:
            pre_messages.append(MessageService.to_read(message))

    if user_message is None or assistant_message is None:
        raise RuntimeError("Failed to load message state for generation job.")

    return GenerationState(
        assistant_message=assistant_message,
        user_message=user_message,
        pre_messages=pre_messages,
    )


async def _finalize_done(
    db: Session,
    *,
    stream_key: str,
    assistant_message: Message,
    citations: list[CitationRead],
    model: str | None,
    used_knowledge: bool,
    used_web_search: bool,
    latency_ms: int,
    ttl_seconds: int,
) -> None:
    stream_store = get_stream_store()
    aggregate = StreamAdapterService.aggregate_stream_events(await stream_store.read_all(stream_key))
    updated_message = MessageService.finalize_assistant_message(
        db,
        assistant_message,
        status="done",
        content=aggregate.content,
        citations=citations,
        model=model,
        used_knowledge=used_knowledge,
        used_web_search=used_web_search,
        latency_ms=latency_ms,
        error_message=None,
    )
    done_event = StreamAdapterService.build_done_event(
        message=MessageService.to_read(updated_message),
    )
    await stream_store.append_event(stream_key, **StreamAdapterService.to_redis_record(done_event))
    await stream_store.set_ttl(stream_key, ttl_seconds)


async def _finalize_failed(
    db: Session,
    *,
    stream_key: str,
    chat_id: str,
    assistant_message_id: str,
    error_message: str,
    ttl_seconds: int,
) -> None:
    assistant_message = MessageService.get_message_by_id(db, assistant_message_id)
    if assistant_message is None:
        return
    stream_store = get_stream_store()
    aggregate = StreamAdapterService.aggregate_stream_events(await stream_store.read_all(stream_key))
    updated_message = MessageService.finalize_assistant_message(
        db,
        assistant_message,
        status="failed",
        content=aggregate.content,
        citations=aggregate.citations,
        model=assistant_message.model,
        used_knowledge=aggregate.used_knowledge,
        used_web_search=aggregate.used_web_search,
        latency_ms=assistant_message.latency_ms,
        error_message=error_message,
    )
    error_event = StreamAdapterService.build_error_event(
        chat_id=chat_id,
        message=error_message,
        assistant_message_id=assistant_message_id,
        final_message=MessageService.to_read(updated_message),
    )
    await stream_store.append_event(stream_key, **StreamAdapterService.to_redis_record(error_event))
    await stream_store.set_ttl(stream_key, ttl_seconds)


async def _finalize_aborted(
    db: Session,
    *,
    stream_key: str,
    assistant_message: Message,
    ttl_seconds: int,
) -> None:
    stream_store = get_stream_store()
    aggregate = StreamAdapterService.aggregate_stream_events(await stream_store.read_all(stream_key))
    updated_message = MessageService.finalize_assistant_message(
        db,
        assistant_message,
        status="aborted",
        content=aggregate.content,
        citations=aggregate.citations,
        model=assistant_message.model,
        used_knowledge=aggregate.used_knowledge,
        used_web_search=aggregate.used_web_search,
        latency_ms=assistant_message.latency_ms,
        error_message=None,
    )
    aborted_event = StreamAdapterService.build_aborted_event(
        message=MessageService.to_read(updated_message)
    )
    await stream_store.append_event(stream_key, **StreamAdapterService.to_redis_record(aborted_event))
    await stream_store.set_ttl(stream_key, ttl_seconds)
