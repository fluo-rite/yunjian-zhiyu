from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol

from redis import asyncio as redis_asyncio

from app.core.config import get_settings


TERMINAL_STREAM_EVENTS = {"message.done", "error", "message.aborted"}


@dataclass(slots=True)
class StreamRecord:
    id: str
    event: str
    data: str
    created_at: str


class StreamStore(Protocol):
    async def append_event(self, stream_key: str, *, event: str, data: str) -> StreamRecord: ...

    async def read_after(self, stream_key: str, last_event_id: str) -> list[StreamRecord]: ...

    async def read_after_blocking(
        self,
        stream_key: str,
        last_event_id: str,
        *,
        block_ms: int,
    ) -> list[StreamRecord]: ...

    async def read_all(self, stream_key: str) -> list[StreamRecord]: ...

    async def set_ttl(self, stream_key: str, ttl_seconds: int) -> None: ...

    async def set_abort_flag(self, abort_key: str) -> None: ...

    async def has_abort_flag(self, abort_key: str) -> bool: ...


class RedisStreamStore:
    def __init__(self, redis_url: str) -> None:
        self._client = redis_asyncio.from_url(redis_url, decode_responses=True)

    async def append_event(self, stream_key: str, *, event: str, data: str) -> StreamRecord:
        created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        record_id = await self._client.xadd(
            stream_key,
            {
                "event": event,
                "data": data,
                "createdAt": created_at,
            },
        )
        return StreamRecord(id=record_id, event=event, data=data, created_at=created_at)

    async def read_after(self, stream_key: str, last_event_id: str) -> list[StreamRecord]:
        records = await self._client.xrange(stream_key, min=f"({last_event_id}", max="+")
        return self._convert_records(records)

    async def read_after_blocking(
        self,
        stream_key: str,
        last_event_id: str,
        *,
        block_ms: int,
    ) -> list[StreamRecord]:
        response = await self._client.xread({stream_key: last_event_id}, block=block_ms, count=100)
        if not response:
            return []
        _, records = response[0]
        return self._convert_records(records)

    async def read_all(self, stream_key: str) -> list[StreamRecord]:
        records = await self._client.xrange(stream_key, min="-", max="+")
        return self._convert_records(records)

    async def set_ttl(self, stream_key: str, ttl_seconds: int) -> None:
        await self._client.expire(stream_key, ttl_seconds)

    async def set_abort_flag(self, abort_key: str) -> None:
        await self._client.set(abort_key, "1", ex=3600)

    async def has_abort_flag(self, abort_key: str) -> bool:
        return bool(await self._client.exists(abort_key))

    @staticmethod
    def _convert_records(records: list[tuple[str, dict[str, str]]]) -> list[StreamRecord]:
        return [
            StreamRecord(
                id=record_id,
                event=fields["event"],
                data=fields["data"],
                created_at=fields.get("createdAt", ""),
            )
            for record_id, fields in records
        ]


def build_stream_key(chat_id: str, assistant_message_id: str) -> str:
    return f"chat:{chat_id}:message:{assistant_message_id}:events"


def build_abort_key(chat_id: str, assistant_message_id: str) -> str:
    return f"chat:{chat_id}:message:{assistant_message_id}:abort"


@lru_cache
def get_stream_store() -> StreamStore:
    settings = get_settings()
    return RedisStreamStore(settings.redis_url)
