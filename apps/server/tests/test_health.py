import asyncio
import json
import threading
import time
from typing import Any

from fastapi.testclient import TestClient

from app.core.db import Base, SessionLocal, engine
from app.main import app
from app.models.card import KnowledgeCard
from app.schemas.message import CitationRead
from app.services.card_generation_service import (
    GeneratedKnowledgeCard,
    GeneratedKnowledgeCardBatch,
    process_knowledge_source_sync,
)
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


class FakeSourceTaskDispatcher:
    def __init__(self) -> None:
        self._threads: list[threading.Thread] = []

    async def enqueue_processing(self, source_id: str) -> None:
        thread = threading.Thread(
            target=lambda: process_knowledge_source_sync(source_id),
            daemon=True,
        )
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


class FakeCardGenerationService:
    def generate_cards(self, *, source_name: str, source_type: str, raw_content: str) -> GeneratedKnowledgeCardBatch:
        _ = source_name
        return GeneratedKnowledgeCardBatch(
            cards=[
                GeneratedKnowledgeCard(
                    title=f"{source_type} 核心知识 1",
                    content=raw_content.strip(),
                    tags=["backend", "test"],
                ),
                GeneratedKnowledgeCard(
                    title=f"{source_type} 核心知识 2",
                    content=f"补充知识：{raw_content.strip()}",
                    tags=["followup"],
                ),
            ]
        )

    @staticmethod
    def content_hash(content: str) -> str:
        return f"fake-hash-{len(content.strip())}"


class FakeEmbeddingService:
    model_name = "fake-embedding-model"

    def embed_content(self, content: str) -> list[float]:
        size = float(len(content.strip()) or 1)
        return [size, size / 10, size / 100]

    def embed_query(self, query: str) -> list[float]:
        size = float(len(query.strip()) or 1)
        return [size, size / 10, size / 100]


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


def insert_card(
    *,
    user_id: str,
    title: str,
    content: str,
    status: str = "active",
    source_id: str | None = None,
    source_type: str = "manual_text",
    tags: list[str] | None = None,
) -> str:
    with SessionLocal() as db:
        card = KnowledgeCard(
            user_id=user_id,
            title=title,
            content=content,
            tags=tags or [],
            status=status,
            source_id=source_id,
            source_type=source_type,
            embedding=[1.0, 0.5, 0.25],
            embedding_model="fake",
            content_hash=f"hash-{title}",
        )
        db.add(card)
        db.commit()
        db.refresh(card)
        return card.id


def install_chat_runtime_test_doubles(monkeypatch) -> FakeThreadTaskDispatcher:
    stream_store = FakeStreamStore()
    dispatcher = FakeThreadTaskDispatcher()

    monkeypatch.setattr("app.api.routes.chats.get_stream_store", lambda: stream_store)
    monkeypatch.setattr("app.api.routes.chats.get_chat_task_dispatcher", lambda: dispatcher)
    monkeypatch.setattr("app.services.chat_generation_service.get_stream_store", lambda: stream_store)

    return dispatcher


def install_source_runtime_test_doubles(monkeypatch) -> FakeSourceTaskDispatcher:
    dispatcher = FakeSourceTaskDispatcher()
    monkeypatch.setattr(
        "app.services.knowledge_source_service.get_knowledge_source_task_dispatcher",
        lambda: dispatcher,
    )
    monkeypatch.setattr(
        "app.services.card_generation_service.get_card_generation_service",
        lambda: FakeCardGenerationService(),
    )
    monkeypatch.setattr(
        "app.services.card_generation_service.get_embedding_service",
        lambda: FakeEmbeddingService(),
    )
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


def test_knowledge_source_from_text_generates_pending_cards(monkeypatch) -> None:
    reset_database()
    dispatcher = install_source_runtime_test_doubles(monkeypatch)
    headers = create_user("source@example.com", "source-user")

    create_response = client.post(
        "/api/v1/knowledge-sources/from-text",
        headers=headers,
        json={
            "name": "FastAPI 学习摘录",
            "content": "FastAPI 使用 APIRouter 管理路由，并配合依赖注入组织接口逻辑。",
        },
    )
    assert create_response.status_code == 202, create_response.text
    source_id = create_response.json()["id"]
    dispatcher.wait_for_idle()

    detail_response = client.get(f"/api/v1/knowledge-sources/{source_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["status"] == "ready"

    cards_response = client.get(f"/api/v1/knowledge-sources/{source_id}/cards", headers=headers)
    assert cards_response.status_code == 200
    items = cards_response.json()["items"]
    assert len(items) == 2
    assert all(item["status"] == "pending" for item in items)

    list_response = client.get("/api/v1/cards", headers=headers, params={"status": "pending"})
    assert list_response.status_code == 200
    assert list_response.json()["pagination"]["total"] == 2


def test_knowledge_source_delete_preview_and_keep_cards(monkeypatch) -> None:
    reset_database()
    dispatcher = install_source_runtime_test_doubles(monkeypatch)
    headers = create_user("delete-source@example.com", "delete-source-user")

    create_response = client.post(
        "/api/v1/knowledge-sources/from-text",
        headers=headers,
        json={"name": "待删除来源", "content": "删除来源时卡片可以保留。"},
    )
    source_id = create_response.json()["id"]
    dispatcher.wait_for_idle()

    cards_response = client.get(f"/api/v1/knowledge-sources/{source_id}/cards", headers=headers)
    card_id = cards_response.json()["items"][0]["id"]
    confirm_response = client.post(f"/api/v1/cards/{card_id}/confirm", headers=headers)
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "active"

    preview_response = client.get(
        f"/api/v1/knowledge-sources/{source_id}/delete-preview",
        headers=headers,
    )
    assert preview_response.status_code == 200
    assert len(preview_response.json()["linkedCards"]) == 2

    delete_response = client.request(
        "DELETE",
        f"/api/v1/knowledge-sources/{source_id}",
        headers=headers,
        json={"deleteCards": False},
    )
    assert delete_response.status_code == 204

    card_response = client.get(f"/api/v1/cards/{card_id}", headers=headers)
    assert card_response.status_code == 200
    assert card_response.json()["sourceId"] is None
    assert card_response.json()["status"] == "active"


def test_card_confirm_archive_and_group_flow(monkeypatch) -> None:
    reset_database()
    dispatcher = install_source_runtime_test_doubles(monkeypatch)
    headers = create_user("group@example.com", "group-user")

    source_response = client.post(
        "/api/v1/knowledge-sources/from-text",
        headers=headers,
        json={"name": "待分组知识", "content": "卡片需要被确认、归档并加入分组。"},
    )
    source_id = source_response.json()["id"]
    dispatcher.wait_for_idle()

    source_cards = client.get(f"/api/v1/knowledge-sources/{source_id}/cards", headers=headers)
    card_id = source_cards.json()["items"][0]["id"]

    confirm_response = client.post(f"/api/v1/cards/{card_id}/confirm", headers=headers)
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "active"

    group_response = client.post(
        "/api/v1/card-groups",
        headers=headers,
        json={"name": "后端专题"},
    )
    assert group_response.status_code == 201, group_response.text
    group_id = group_response.json()["id"]

    add_response = client.post(
        f"/api/v1/card-groups/{group_id}/cards",
        headers=headers,
        json={"cardId": card_id},
    )
    assert add_response.status_code == 204

    group_cards_response = client.get(f"/api/v1/card-groups/{group_id}/cards", headers=headers)
    assert group_cards_response.status_code == 200
    assert group_cards_response.json()["items"][0]["id"] == card_id

    archive_response = client.post(f"/api/v1/cards/{card_id}/archive", headers=headers)
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"

    remove_response = client.delete(
        f"/api/v1/card-groups/{group_id}/cards/{card_id}",
        headers=headers,
    )
    assert remove_response.status_code == 204

    group_cards_after_remove = client.get(f"/api/v1/card-groups/{group_id}/cards", headers=headers)
    assert group_cards_after_remove.status_code == 200
    assert group_cards_after_remove.json()["items"] == []


def test_confirm_cards_confirms_multiple_pending_cards(monkeypatch) -> None:
    reset_database()
    dispatcher = install_source_runtime_test_doubles(monkeypatch)
    headers = create_user("batch-confirm@example.com", "batch-confirm-user")

    source_response = client.post(
        "/api/v1/knowledge-sources/from-text",
        headers=headers,
        json={"name": "批量确认来源", "content": "需要批量确认的卡片。"},
    )
    source_id = source_response.json()["id"]
    dispatcher.wait_for_idle()

    source_cards = client.get(f"/api/v1/knowledge-sources/{source_id}/cards", headers=headers)
    items = source_cards.json()["items"]
    card_ids = [item["id"] for item in items]

    confirm_response = client.post(
        "/api/v1/cards/confirm",
        headers=headers,
        json={"cardIds": card_ids},
    )
    assert confirm_response.status_code == 200, confirm_response.text
    assert len(confirm_response.json()["items"]) == len(card_ids)
    assert all(item["status"] == "active" for item in confirm_response.json()["items"])

    active_cards = client.get("/api/v1/cards", headers=headers, params={"status": "active"})
    assert active_cards.status_code == 200
    assert active_cards.json()["pagination"]["total"] == len(card_ids)


def test_knowledge_source_from_document_accepts_upload(monkeypatch) -> None:
    reset_database()
    dispatcher = install_source_runtime_test_doubles(monkeypatch)
    headers = create_user("document@example.com", "document-user")

    response = client.post(
        "/api/v1/knowledge-sources/from-document",
        headers=headers,
        data={"name": "FastAPI 文档"},
        files={"file": ("fastapi.txt", "FastAPI 的响应模型用于约束输出。", "text/plain")},
    )
    assert response.status_code == 202, response.text
    source_id = response.json()["id"]
    dispatcher.wait_for_idle()

    detail_response = client.get(f"/api/v1/knowledge-sources/{source_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["sourceType"] == "document"
    assert "FastAPI 的响应模型" in detail_response.json()["rawContent"]


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
    dispatcher = install_chat_runtime_test_doubles(monkeypatch)
    headers = create_user("messages@example.com", "messages-user")
    chat_id = create_chat(headers, "FastAPI chat")
    me_response = client.get("/api/v1/auth/me", headers=headers)
    user_id = me_response.json()["id"]

    card_id = insert_card(
        user_id=user_id,
        title="FastAPI routing basics",
        content="Dependency injection and response models keep handlers clear and consistent.",
        tags=["FastAPI", "Routing"],
    )
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
    assistant_message_id = create_response.json()["assistantMessageId"]

    history_response = client.get(f"/api/v1/chats/{chat_id}/messages", headers=headers)
    assert history_response.status_code == 200, history_response.text
    history_items = history_response.json()["items"]
    assert len(history_items) == 2
    assert history_items[0]["role"] == "user"
    assert history_items[1]["role"] == "assistant"

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
    dispatcher = install_chat_runtime_test_doubles(monkeypatch)
    headers = create_user("resume@example.com", "resume-user")
    chat_id = create_chat(headers, "Resume chat")
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    card_id = insert_card(
        user_id=user_id,
        title="LangGraph streaming basics",
        content="The server can adapt raw internal graph events into business SSE events.",
        tags=["LangGraph", "Streaming"],
    )
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


def test_chat_message_stream_treats_empty_last_event_id_as_replay_from_start(monkeypatch) -> None:
    reset_database()
    dispatcher = install_chat_runtime_test_doubles(monkeypatch)
    headers = create_user("empty-last-event@example.com", "empty-last-event-user")
    chat_id = create_chat(headers, "Empty cursor chat")
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    card_id = insert_card(
        user_id=user_id,
        title="Cursor normalization card",
        content="Stream resume should not fail when the cursor query parameter is empty.",
        tags=["Streaming"],
    )
    _patch_chat_agent(
        monkeypatch,
        card_id=card_id,
        content="An empty lastEventId query value should fall back to replaying from the start.",
    )

    create_response = client.post(
        f"/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": "Explain the empty lastEventId behavior.",
            "options": {"useKnowledge": True, "useWebSearch": False},
        },
    )
    assistant_message_id = create_response.json()["assistantMessageId"]

    with client.stream(
        "GET",
        f"/api/v1/chats/{chat_id}/messages/{assistant_message_id}/stream?lastEventId=",
        headers=headers,
    ) as response:
        payload = "".join(response.iter_text())

    events = _parse_sse_events(payload)
    assert response.status_code == 200
    assert events[0]["event"] == "message.start"
    assert events[-1]["event"] == "message.done"
    dispatcher.wait_for_idle()


def test_chat_message_conflict_returns_active_stream(monkeypatch) -> None:
    reset_database()
    dispatcher = install_chat_runtime_test_doubles(monkeypatch)
    headers = create_user("conflict@example.com", "conflict-user")
    chat_id = create_chat(headers, "Conflict chat")
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    card_id = insert_card(
        user_id=user_id,
        title="Slow streaming card",
        content="Slow streaming details",
        tags=["Slow"],
    )
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
    dispatcher = install_chat_runtime_test_doubles(monkeypatch)
    headers = create_user("abort@example.com", "abort-user")
    chat_id = create_chat(headers, "Abort chat")
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["id"]

    card_id = insert_card(
        user_id=user_id,
        title="Abort card",
        content="Abort details",
        tags=["Abort"],
    )
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
