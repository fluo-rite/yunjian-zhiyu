from datetime import datetime

from pydantic import ConfigDict, Field

from app.schemas.common import CamelModel
from app.schemas.card import CardRead


class CreateCardGroupRequest(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"name": "FastAPI 专题"}}
    )

    name: str = Field(min_length=1, max_length=100, examples=["FastAPI 专题"])


class UpdateCardGroupRequest(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"name": "后端基础"}}
    )

    name: str = Field(min_length=1, max_length=100, examples=["后端基础"])


class CardGroupRead(CamelModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "28f8ab4b-955b-4ac3-a89e-e0bbdcb3777e",
                "name": "FastAPI 专题",
                "createdAt": "2026-05-17T10:00:00+08:00",
                "updatedAt": "2026-05-17T10:00:00+08:00",
            }
        }
    )

    id: str
    name: str
    created_at: datetime
    updated_at: datetime


class CardGroupListResponse(CamelModel):
    items: list[CardGroupRead]


class UpdateGroupCardsRequest(CamelModel):
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


class CardGroupCardsResponse(CamelModel):
    items: list[CardRead]
