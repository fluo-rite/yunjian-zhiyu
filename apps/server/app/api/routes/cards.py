from typing import get_args

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.card import CardCreate, CardListResponse, CardRead, CardStatus, CardType, CardUpdate
from app.services.card_service import CardService

router = APIRouter(prefix="/cards", tags=["cards"])


CARD_STATUS_VALUES = get_args(CardStatus)
CARD_TYPE_VALUES = get_args(CardType)


def _normalize_optional_enum_query(
    value: str | None,
    *,
    field_name: str,
    allowed_values: tuple[str, ...],
) -> str | None:
    if value in (None, ""):
        return None

    if value not in allowed_values:
        expected = " or ".join(f"'{item}'" for item in allowed_values)
        raise RequestValidationError(
            [
                {
                    "type": "literal_error",
                    "loc": ("query", field_name),
                    "msg": f"Input should be {expected}",
                    "input": value,
                    "ctx": {"expected": expected},
                }
            ]
        )
    return value


@router.post("", response_model=CardRead, status_code=status.HTTP_201_CREATED)
def create_card(
    payload: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardRead:
    return CardService.create(db, current_user, payload)


@router.get("", response_model=CardListResponse)
def list_cards(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None, json_schema_extra={"enum": list(CARD_STATUS_VALUES)}),
    card_type: str | None = Query(default=None, json_schema_extra={"enum": list(CARD_TYPE_VALUES)}),
    keyword: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardListResponse:
    normalized_status = _normalize_optional_enum_query(
        status,
        field_name="status",
        allowed_values=CARD_STATUS_VALUES,
    )
    normalized_card_type = _normalize_optional_enum_query(
        card_type,
        field_name="card_type",
        allowed_values=CARD_TYPE_VALUES,
    )
    return CardService.list(
        db,
        current_user,
        page=page,
        page_size=page_size,
        status=normalized_status,
        card_type=normalized_card_type,
        keyword=keyword,
        tag=tag,
    )


@router.get("/{card_id}", response_model=CardRead)
def get_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardRead:
    card = CardService.get_or_none(db, current_user, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    return CardRead.model_validate(card)


@router.patch("/{card_id}", response_model=CardRead)
def update_card(
    card_id: str,
    payload: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardRead:
    card = CardService.get_or_none(db, current_user, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    return CardService.update(db, card, payload)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    card = CardService.get_or_none(db, current_user, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    CardService.delete(db, card)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
