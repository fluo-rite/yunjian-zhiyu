from fastapi.testclient import TestClient

from app.core.db import Base, engine
from app.main import app


client = TestClient(app)


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


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

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "cards@example.com",
            "username": "cards-user",
            "password": "strong-pass-123",
            "nickname": "Cards",
        },
    )
    token = register_response.json()["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

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

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "chats@example.com",
            "username": "chats-user",
            "password": "strong-pass-123",
            "nickname": "Chats",
        },
    )
    token = register_response.json()["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    create_response = client.post(
        "/api/v1/chats",
        headers=headers,
        json={"title": "My first chat"},
    )
    assert create_response.status_code == 201, create_response.text
    chat_id = create_response.json()["id"]

    list_response = client.get("/api/v1/chats", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["pagination"]["total"] == 1

    detail_response = client.get(f"/api/v1/chats/{chat_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["chat"]["title"] == "My first chat"
    assert detail_response.json()["messages"] == []

    delete_response = client.delete(f"/api/v1/chats/{chat_id}", headers=headers)
    assert delete_response.status_code == 204


def test_chat_message_flow_with_knowledge_citations() -> None:
    reset_database()

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "messages@example.com",
            "username": "messages-user",
            "password": "strong-pass-123",
            "nickname": "Messages",
        },
    )
    token = register_response.json()["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    card_response = client.post(
        "/api/v1/cards",
        headers=headers,
        json={
            "title": "FastAPI 路由基础",
            "summary": "FastAPI 通过装饰器声明路径操作函数。",
            "content": "常见做法包括使用 APIRouter、依赖注入和清晰的响应模型。",
            "cardType": "concept",
            "tags": ["FastAPI", "Routing"],
            "status": "active",
            "sourceType": "manual",
        },
    )
    assert card_response.status_code == 201, card_response.text
    card_id = card_response.json()["id"]

    create_chat_response = client.post(
        "/api/v1/chats",
        headers=headers,
        json={"title": "FastAPI 对话"},
    )
    assert create_chat_response.status_code == 201, create_chat_response.text
    chat_id = create_chat_response.json()["id"]

    message_response = client.post(
        f"/api/v1/chats/{chat_id}/messages",
        headers=headers,
        json={
            "content": "帮我总结一下 FastAPI 路由的核心知识点",
            "options": {"useKnowledge": True, "useWebSearch": True},
        },
    )
    assert message_response.status_code == 200, message_response.text
    payload = message_response.json()
    assert payload["message"]["role"] == "assistant"
    assert payload["message"]["metadata"]["usedKnowledge"] is True
    assert payload["message"]["metadata"]["usedWebSearch"] is False
    assert payload["message"]["metadata"]["model"] == "local-fallback"
    assert payload["citations"][0]["type"] == "knowledge_card"
    assert payload["citations"][0]["sourceId"] == card_id

    detail_response = client.get(f"/api/v1/chats/{chat_id}", headers=headers)
    assert detail_response.status_code == 200, detail_response.text
    detail_payload = detail_response.json()
    assert len(detail_payload["messages"]) == 2
    assert detail_payload["messages"][0]["role"] == "user"
    assert detail_payload["messages"][1]["role"] == "assistant"
    assert detail_payload["messages"][1]["metadata"]["citations"][0]["sourceId"] == card_id
