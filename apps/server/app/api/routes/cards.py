from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.card import (
    ArchiveCardResponse,
    CardListResponse,
    CardRead,
    ConfirmCardsRequest,
    ConfirmCardsResponse,
    RestoreCardResponse,
)
from app.services.card_service import CardService

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("", response_model=CardListResponse)
def list_cards(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    source_id: str | None = Query(default=None),
    group_id: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardListResponse:
    return CardService.list(
        db,
        current_user,
        page=page,
        page_size=page_size,
        status=status,
        source_type=source_type,
        source_id=source_id,
        group_id=group_id,
        keyword=keyword,
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


@router.post("/confirm", response_model=ConfirmCardsResponse)
def confirm_cards(
    payload: ConfirmCardsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConfirmCardsResponse:
    cards = CardService.list_by_ids(db, current_user, payload.card_ids)
    if len(cards) != len(payload.card_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more cards were not found.")
    if any(card.status != "pending" for card in cards):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending cards can be confirmed.",
        )
    return CardService.confirm_many(db, cards)


@router.post("/{card_id}/archive", response_model=ArchiveCardResponse)
def archive_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArchiveCardResponse:
    card = CardService.get_or_none(db, current_user, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    if card.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only active cards can be archived.",
        )
    return CardService.archive(db, card)


@router.post("/{card_id}/restore", response_model=RestoreCardResponse)
def restore_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RestoreCardResponse:
    card = CardService.get_or_none(db, current_user, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    if card.status != "archived":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only archived cards can be restored.",
        )
    return CardService.restore(db, card)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    card = CardService.get_or_none(db, current_user, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    CardService.delete(db, card)
