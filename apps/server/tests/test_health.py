import asyncio
import json
import threading
import time
from typing import Any

from fastapi.testclient import TestClient

from app.core.db import Base, engine
from app.main import app
from app.schemas.message import CitationRead
from app.services.chat_generation_service import ChatTaskDispatcher, run_chat_generation
from app.services.stream_store_service import StreamRecord


client = TestClient(app)


class FakeChatAgent:
    def __init__(
        self,
        *,
        content: str,
        citations: list[CitationRead],
        delay_seconds: float = 0.0,
        chunk_size: int = 12,
    ) -> None:
        self._content = content
        self._citations = citations
        self._delay_seconds = delay_seconds
        self._chunk_size = chunk_size

    async def reply(self, **_):
        yield {"type": "message_start"}

        for index in range(0, len(self._content), self._chunk_size):
            if self._delay_seconds:
                await asyncio.sleep(self._delay_seconds)
            yield {
                "type": "message_delta",
                "delta": self._content[index : index + self._chunk_size],
            }

        yield {
            "type": "message_complete",
            "content": self._content,
            "citations": self._citations,
            "used_knowledge": bool(self._citations),
            "used_web_search": False,
        }


class FakeStreamStore:
    def __init__(self) -> None:
        self._streams: dict[str, list[StreamRecord]] = {}
        self._counters: dict[str, int] = {}
        self._ttl_deadlines: dict[str, float] = {}
        self._abort_flags: dict[str, float] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _parse_event_id(value: str) -> tuple[int, int]:
        major, _, minor = value.partition("-")
        return int(major or 0), int(minor or 0)

    def _prune(self) -> None:
        now = time.monotonic()
        expired_stream_keys = [
            stream_key
            for stream_key, deadline in self._ttl_deadlines.items()
            if deadline <= now
        ]
        for stream_key in expired_stream_keys:
            self._streams.pop(stream_key, None)
            self._counters.pop(stream_key, None)
            self._ttl_deadlines.pop(stream_key, None)

        expired_abort_keys = [
            abort_key for abort_key, deadline in self._abort_flags.items() if deadline <= now
        ]
        for abort_key in expired_abort_keys:
            self._abort_flags.pop(abort_key, None)

    async def append_event(self, stream_key: str, *, event: str, data: str) -> StreamRecord:
        with self._lock:
            self._prune()
            next_id = self._counters.get(stream_key, 0) + 1
            self._counters[stream_key] = next_id
            record = StreamRecord(
                id=f"{next_id}-0",
                event=event,
                data=data,
                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )
            self._streams.setdefault(stream_key, []).append(record)
            return record

    async def read_after(self, stream_key: str, last_event_id: str) -> list[StreamRecord]:
        with self._lock:
            self._prune()
            boundary = self._parse_event_id(last_event_id)
            return [
                record
                for record in self._streams.get(stream_key, [])
                if self._parse_event_id(record.id) > boundary
            ]

    async def read_after_blocking(
        self,
        stream_key: str,
        last_event_id: str,
        *,
        block_ms: int,
    ) -> list[StreamRecord]:
        records = await self.read_after(stream_key, last_event_id)
        if records:
            return records
        await asyncio.sleep(block_ms / 1000)
        return await self.read_after(stream_key, last_event_id)

    async def read_all(self, stream_key: str) -> list[StreamRecord]:
        return await self.read_after(stream_key, "0-0")

    async def set_ttl(self, stream_key: str, ttl_seconds: int) -> None:
        with self._lock:
            self._prune()
            self._ttl_deadlines[stream_key] = time.monotonic() + ttl_seconds

    async def set_abort_flag(self, abort_key: str) -> None:
        with self._lock:
            self._prune()
            self._abort_flags[abort_key] = time.monotonic() + 3600

    async def has_abort_flag(self, abort_key: str) -> bool:
        with self._lock:
            self._prune()
            return abort_key in self._abort_flags


class FakeThreadTaskDispatcher(ChatTaskDispatcher):
    def __init__(self) -> None:
        self._threads: list[threading.Thread] = []

    async def enqueue_generation(self, job) -> None:
        thread = threading.Thread(target=lambda: asyncio.run(run_chat_generation(job)), daemon=True)
        self._threads.append(thread)
        thread.start()

    def wait_for_idle(self, timeout: float = 5.0) -> None:
        deadline = time.monotonic() + timeout
        for thread in self._threads:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            thread.join(remaining)
        self._threads = [thread for thread in self._threads if thread.is_alive()]


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def create_user(email: str, username: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "username": username,
            "password": "strong-pass-123",
            "nickname": username,
        },
    )
    assert response.status_code == 201, response.text
    token = response.json()["tokens"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def create_chat(headers: dict[str, str], title: str) -> str:
    response = client.post("/api/v1/chats", headers=headers, json={"title": title})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def install_runtime_test_doubles(monkeypatch) -> FakeThreadTaskDispatcher:
    stream_store = FakeStreamStore()
    dispatcher = FakeThreadTaskDispatcher()

    monkeypatch.setattr("app.api.routes.chats.get_stream_store", lambda: stream_store)
    monkeypatch.setattr("app.api.routes.chats.get_chat_task_dispatcher", lambda: dispatcher)
    monkeypatch.setattr("app.services.chat_generation_service.get_stream_store", lambda: stream_store)

    return dispatcher


def _parse_sse_events(body: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    current_id: str | None = None
    current_event: str | None = None
    current_data: list[str] = []

    for line in body.splitlines():
        if line.startswith("id:"):
            current_id = line.removeprefix("id:").strip()
            continue
        if line.startswith("event:"):
            current_event = line.removeprefix("event:").strip()
            continue
        if line.startswith("data:"):
            current_data.append(line.removeprefix("data:").strip())
            continue
        if not line.strip() and current_event:
            events.append(
                {
                    "id": current_id,
                    "event": current_event,
                    "data": json.loads("".join(current_data)),
                }
            )
            current_id = None
            current_event = None
            current_data = []

    if current_event:
        events.append(
            {
                "id": current_id,
                "event": current_event,
                "data": json.loads("".join(current_data)),
            }
        )

    return events


def _patch_chat_agent(
    monkeypatch,
    *,
    card_id: str,
    content: str,
    delay_seconds: float = 0.0,
    chunk_size: int = 12,
) -> None:
    fake_agent = FakeChatAgent(
        content=content,
        citations=[
            CitationRead(
                type="knowledge_card",
                title="FastAPI routing basics",
                source_id=card_id,
                snippet="Routes are usually declared with decorators and APIRouter.",
            )
        ],
        delay_seconds=delay_seconds,
        chunk_size=chunk_size,
    )
    monkeypatch.setattr("app.services.chat_generation_service.get_chat_agent", lambda: fake_agent)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_auth_register_login_and_me() -> None:
    reset_database()

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice@example.com",
            "username": "alice",
            "password": "strong-pass-123",
            "nickname": "Alice",
        },
    )
    assert register_response.status_code == 201, register_response.text
    access_token = register_response.json()["tokens"]["accessToken"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "alice@example.com"

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "account": "alice@example.com",
            "password": "strong-pass-123",
        },
    )
    assert login_response.status_code == 200, login_response.text
    assert login_response.json()["user"]["username"] == "alice"


def test_cards_crud_flow() -> None:
    reset_database()
    headers = create_user("cards@example.com", "cards-user")

    create_response = client.post(
        "/api/v1/cards",
        headers=headers,
        json={
            "title": "FastAPI Routing",
            "summary": "Routes with decorators",
            "content": "Detailed notes",
            "cardType": "concept",
            "tags": ["FastAPI", "Backend"],
            "status": "active",
            "sourceType": "manual",
        },
    )
    assert create_response.status_code == 201, create_response.text
    card_id = create_response.json()["id"]

    list_response = client.get("/api/v1/cards", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["pagination"]["total"] == 1
    assert list_response.json()["items"][0]["title"] == "FastAPI Routing"

    update_response = client.patch(
        f"/api/v1/cards/{card_id}",
        headers=headers,
        json={"status": "archived", "tags": ["FastAPI"]},
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["status"] == "archived"
    assert update_response.json()["tags"] == ["FastAPI"]

    delete_response = client.delete(f"/api/v1/cards/{card_id}", headers=headers)
    assert delete_response.status_code == 204


def test_chats_crud_flow() -> None:
    reset_database()
    headers = create_user("chats@example.com", "chats-user")
    chat_id = create_chat(headers, "My first chat")

    list_response = client.get("/api/v1/chats", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["pagination"]["total"] == 1

    messages_response = client.get(f"/api/v1/chats/{chat_id}/messages", headers=headers)
    assert messages_response.status_code == 200
    assert messages_response.json()["items"] == []

    delete_response = client.delete(f"/api/v1/chats/{chat_id}", headers=headers)
    assert delete_response.status_code == 204


def test_chat_message_creation_stream_and_history(monkeypatch) -> None:
    reset_database()
    dispatcher = install_runtime_test_doubles(monkeypatch)
    headers = create_user("messages@example.com", "messages-user")
    chat_id = create_chat(headers, "FastAPI chat")

    card_response = client.post(
        "/api/v1/cards",
        headers=headers,
        json={
            "title": "FastAPI routing basics",
            "summary": "Routes are usually declared with decorators and APIRouter.",
            "content": "Dependency injection and response models keep handlers clear and consistent.",
            "cardType": "concept",
            "tags": ["FastAPI", "Routing"],
            "status": "active",
            "sourceType": "manual",
        },
    )
    assert card_response.status_code == 201, card_response.text
    card_id = card_response.json()["id"]
    _patch_chat_agent(
        monkeypatch,
        card_id=card_id,
        content="FastAPI routing usually starts with APIRouter, decorators, and clear response models.",
        delay_seconds=0.02,
    )

    create_response = client.post(
        f"/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": "Summarize the core ideas behind FastAPI routing.",
            "options": {"useKnowledge": True, "useWebSearch": True},
        },
    )
    assert create_response.status_code == 200, create_response.text
    created_payload = create_response.json()
    assistant_message_id = created_payload["assistantMessageId"]

    history_response = client.get(f"/api/v1/chats/{chat_id}/messages", headers=headers)
    assert history_response.status_code == 200, history_response.text
    history_items = history_response.json()["items"]
    assert len(history_items) == 2
    assert history_items[0]["role"] == "user"
    assert history_items[1]["role"] == "assistant"
    assert history_items[1]["streamUrl"].endswith(f"/messages/{assistant_message_id}/stream")

    with client.stream(
        "GET",
        f"/api/v1/chats/{chat_id}/messages/{assistant_message_id}/stream?lastEventId=0-0",
        headers=headers,
    ) as response:
        assert response.status_code == 200, response.text
        assert response.headers["content-type"].startswith("text/event-stream")
        payload = "".join(response.iter_text())

    events = _parse_sse_events(payload)
    assert events[0]["event"] == "message.start"
    assert "message.delta" in [item["event"] for item in events]
    assert events[-1]["event"] == "message.done"
    assert events[-1]["data"]["message"]["status"] == "done"
    assert events[-1]["data"]["citations"][0]["sourceId"] == card_id

    history_response = client.get(f"/api/v1/chats/{chat_id}/messages", headers=headers)
    final_items = history_response.json()["items"]
    assert final_items[-1]["status"] == "done"
    assert final_items[-1]["content"].startswith("FastAPI routing usually starts")
    assert final_items[-1]["metadata"]["citations"][0]["sourceId"] == card_id
    dispatcher.wait_for_idle()


def test_chat_message_stream_can_resume_from_last_event_id(monkeypatch) -> None:
    reset_database()
    dispatcher = install_runtime_test_doubles(monkeypatch)
    headers = create_user("resume@example.com", "resume-user")
    chat_id = create_chat(headers, "Resume chat")

    card_response = client.post(
        "/api/v1/cards",
        headers=headers,
        json={
            "title": "LangGraph streaming basics",
            "summary": "A graph node can emit custom streaming chunks.",
            "content": "The server can adapt those chunks into business SSE events for the client.",
            "cardType": "concept",
            "tags": ["LangGraph", "Streaming"],
            "status": "active",
            "sourceType": "manual",
        },
    )
    assert card_response.status_code == 201, card_response.text
    card_id = card_response.json()["id"]
    _patch_chat_agent(
        monkeypatch,
        card_id=card_id,
        content="LangGraph can stream raw internal events and let the server adapt them into business SSE messages.",
    )

    create_response = client.post(
        f"/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": "Summarize the LangGraph streaming setup for me.",
            "options": {"useKnowledge": True, "useWebSearch": False},
        },
    )
    assistant_message_id = create_response.json()["assistantMessageId"]

    with client.stream(
        "GET",
        f"/api/v1/chats/{chat_id}/messages/{assistant_message_id}/stream?lastEventId=0-0",
        headers=headers,
    ) as response:
        payload = "".join(response.iter_text())

    events = _parse_sse_events(payload)
    assert len(events) >= 3
    first_event_id = events[0]["id"]

    with client.stream(
        "GET",
        f"/api/v1/chats/{chat_id}/messages/{assistant_message_id}/stream?lastEventId={first_event_id}",
        headers=headers,
    ) as response:
        resumed_payload = "".join(response.iter_text())

    resumed_events = _parse_sse_events(resumed_payload)
    assert resumed_events
    assert resumed_events[0]["id"] != first_event_id
    assert resumed_events[-1]["event"] == "message.done"
    dispatcher.wait_for_idle()


def test_chat_message_conflict_returns_active_stream(monkeypatch) -> None:
    reset_database()
    dispatcher = install_runtime_test_doubles(monkeypatch)
    headers = create_user("conflict@example.com", "conflict-user")
    chat_id = create_chat(headers, "Conflict chat")

    card_response = client.post(
        "/api/v1/cards",
        headers=headers,
        json={
            "title": "Slow streaming card",
            "summary": "Slow streaming summary",
            "content": "Slow streaming details",
            "cardType": "concept",
            "tags": ["Slow"],
            "status": "active",
            "sourceType": "manual",
        },
    )
    assert card_response.status_code == 201, card_response.text
    card_id = card_response.json()["id"]
    _patch_chat_agent(
        monkeypatch,
        card_id=card_id,
        content="This response is intentionally slow so that the second request collides.",
        delay_seconds=0.15,
        chunk_size=8,
    )

    first_response = client.post(
        f"/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": "First prompt",
            "options": {"useKnowledge": True, "useWebSearch": False},
        },
    )
    assert first_response.status_code == 200, first_response.text
    active_message_id = first_response.json()["assistantMessageId"]

    second_response = client.post(
        f"/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": "Second prompt",
            "options": {"useKnowledge": True, "useWebSearch": False},
        },
    )
    assert second_response.status_code == 409, second_response.text
    conflict_payload = second_response.json()["detail"]
    assert conflict_payload["code"] == "CHAT_GENERATION_IN_PROGRESS"
    assert conflict_payload["activeMessage"]["id"] == active_message_id

    with client.stream(
        "GET",
        f"/api/v1/chats/{chat_id}/messages/{active_message_id}/stream?lastEventId=0-0",
        headers=headers,
    ) as response:
        payload = "".join(response.iter_text())

    assert _parse_sse_events(payload)[-1]["event"] == "message.done"
    dispatcher.wait_for_idle()


def test_chat_message_abort_preserves_partial_content(monkeypatch) -> None:
    reset_database()
    dispatcher = install_runtime_test_doubles(monkeypatch)
    headers = create_user("abort@example.com", "abort-user")
    chat_id = create_chat(headers, "Abort chat")

    card_response = client.post(
        "/api/v1/cards",
        headers=headers,
        json={
            "title": "Abort card",
            "summary": "Abort summary",
            "content": "Abort details",
            "cardType": "concept",
            "tags": ["Abort"],
            "status": "active",
            "sourceType": "manual",
        },
    )
    assert card_response.status_code == 201, card_response.text
    card_id = card_response.json()["id"]
    _patch_chat_agent(
        monkeypatch,
        card_id=card_id,
        content="This response should stop after a partial chunk because the user aborted it.",
        delay_seconds=0.08,
        chunk_size=10,
    )

    create_response = client.post(
        f"/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": "Abort this generation",
            "options": {"useKnowledge": True, "useWebSearch": False},
        },
    )
    assert create_response.status_code == 200, create_response.text
    assistant_message_id = create_response.json()["assistantMessageId"]

    time.sleep(0.12)

    abort_response = client.post(
        f"/api/v1/chats/{chat_id}/messages/{assistant_message_id}/abort",
        headers=headers,
    )
    assert abort_response.status_code == 200, abort_response.text
    assert abort_response.json()["status"] == "aborting"

    with client.stream(
        "GET",
        f"/api/v1/chats/{chat_id}/messages/{assistant_message_id}/stream?lastEventId=0-0",
        headers=headers,
    ) as response:
        payload = "".join(response.iter_text())

    events = _parse_sse_events(payload)
    assert events[-1]["event"] == "message.aborted"
    assert events[-1]["data"]["message"]["status"] == "aborted"
    assert events[-1]["data"]["message"]["content"] != ""

    history_response = client.get(f"/api/v1/chats/{chat_id}/messages", headers=headers)
    final_message = history_response.json()["items"][-1]
    assert final_message["status"] == "aborted"
    assert final_message["content"] != ""
    dispatcher.wait_for_idle()
