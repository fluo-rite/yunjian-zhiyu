from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.common import CamelModel, PaginationMeta

CardStatus = Literal["pending", "active", "archived"]
SourceType = Literal["manual_text", "document", "messages"]


class CardRead(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "b6d94870-4bdf-4b5f-8d6e-94c72f98d2f5",
                "title": "FastAPI 路由基础",
                "content": "FastAPI 通常使用 APIRouter、装饰器和依赖注入来组织接口。",
                "tags": ["FastAPI", "Routing", "Backend"],
                "status": "active",
                "sourceType": "manual_text",
                "sourceId": "1f7d6c58-4cf1-455f-b218-e3b6e7e0c9a7",
                "createdAt": "2026-05-17T10:00:00+08:00",
                "updatedAt": "2026-05-17T10:05:00+08:00",
            }
        }
    )

    id: str
    title: str
    content: str
    tags: list[str]
    status: CardStatus
    source_type: SourceType
    source_id: str | None = None
    created_at: datetime
    updated_at: datetime


class CardListResponse(CamelModel):
    items: list[CardRead]
    pagination: PaginationMeta


class ConfirmCardsRequest(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "cardIds": [
                    "b6d94870-4bdf-4b5f-8d6e-94c72f98d2f5",
                    "8d9674b3-2d3d-4f0c-87ab-54eeb2b08b6f",
                ]
            }
        }
    )

    card_ids: list[str] = Field(
        min_length=1,
        max_length=100,
        examples=[["b6d94870-4bdf-4b5f-8d6e-94c72f98d2f5"]],
    )


class ConfirmCardsResponse(CamelModel):
    items: list[CardRead]


class ArchiveCardResponse(CardRead):
    pass
