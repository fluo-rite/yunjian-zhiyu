from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.card import CardRead, SourceType
from app.schemas.common import CamelModel, PaginationMeta

KnowledgeSourceStatus = Literal["processing", "ready", "failed"]


class CreateKnowledgeSourceFromTextRequest(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "FastAPI 路由学习笔记",
                "content": "FastAPI 使用 APIRouter、依赖注入和响应模型来组织接口。",
            }
        }
    )

    name: str = Field(min_length=1, max_length=200, examples=["FastAPI 路由学习笔记"])
    content: str = Field(
        min_length=1,
        examples=["FastAPI 使用 APIRouter、依赖注入和响应模型来组织接口。"],
    )


class CreateKnowledgeSourceFromMessagesRequest(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "FastAPI 对话摘录",
                "messages": [
                    "FastAPI 推荐使用 APIRouter 按领域拆分路由。",
                    "依赖注入可以把鉴权和数据库会话从 handler 中抽离出去。",
                ],
            }
        }
    )

    name: str = Field(min_length=1, max_length=200, examples=["FastAPI 对话摘录"])
    messages: list[str] = Field(
        min_length=1,
        examples=[["FastAPI 推荐使用 APIRouter 按领域拆分路由。"]],
    )


class KnowledgeSourceRead(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "1f7d6c58-4cf1-455f-b218-e3b6e7e0c9a7",
                "name": "FastAPI 路由学习笔记",
                "sourceType": "manual_text",
                "status": "ready",
                "createdAt": "2026-05-17T10:00:00+08:00",
                "updatedAt": "2026-05-17T10:01:30+08:00",
            }
        }
    )

    id: str
    name: str
    source_type: SourceType
    status: KnowledgeSourceStatus
    created_at: datetime
    updated_at: datetime


class KnowledgeSourceListResponse(CamelModel):
    items: list[KnowledgeSourceRead]
    pagination: PaginationMeta


class KnowledgeSourceDetailRead(KnowledgeSourceRead):
    raw_content: str
    source_metadata: dict | None = None


class KnowledgeSourceCardsResponse(CamelModel):
    items: list[CardRead]


class LinkedCardPreview(CamelModel):
    id: str
    title: str
    status: Literal["pending", "active", "archived"]


class KnowledgeSourceDeletePreviewResponse(CamelModel):
    source: KnowledgeSourceRead
    linked_cards: list[LinkedCardPreview]


class DeleteKnowledgeSourceRequest(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"deleteCards": False}}
    )

    delete_cards: bool = Field(examples=[False])
