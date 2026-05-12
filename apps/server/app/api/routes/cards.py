from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.card import CardCreate, CardListResponse, CardRead, CardUpdate
from app.services.card_service import CardService

router = APIRouter(prefix="/cards", tags=["cards"])


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
    status: str | None = Query(default=None),
    card_type: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardListResponse:
    return CardService.list(
        db,
        current_user,
        page=page,
        page_size=page_size,
        status=status,
        card_type=card_type,
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
