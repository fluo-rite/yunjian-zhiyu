from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.card_group import (
    AddCardToGroupRequest,
    CardGroupCardsResponse,
    CardGroupListResponse,
    CardGroupRead,
    CreateCardGroupRequest,
    UpdateCardGroupRequest,
)
from app.services.card_group_service import CardGroupService

router = APIRouter(prefix="/card-groups", tags=["card-groups"])


@router.post("", response_model=CardGroupRead, status_code=status.HTTP_201_CREATED)
def create_card_group(
    payload: CreateCardGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardGroupRead:
    return CardGroupService.create(db, current_user, name=payload.name)


@router.get("", response_model=CardGroupListResponse)
def list_card_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardGroupListResponse:
    return CardGroupService.list(db, current_user)


@router.get("/{group_id}", response_model=CardGroupRead)
def get_card_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardGroupRead:
    group = CardGroupService.get_or_none(db, current_user, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card group not found.")
    return CardGroupRead.model_validate(group)


@router.get("/{group_id}/cards", response_model=CardGroupCardsResponse)
def list_group_cards(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardGroupCardsResponse:
    group = CardGroupService.get_or_none(db, current_user, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card group not found.")
    return CardGroupCardsResponse(items=CardGroupService.list_cards(db, current_user, group_id))


@router.patch("/{group_id}", response_model=CardGroupRead)
def update_card_group(
    group_id: str,
    payload: UpdateCardGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CardGroupRead:
    group = CardGroupService.get_or_none(db, current_user, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card group not found.")
    return CardGroupService.rename(db, group, name=payload.name)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    group = CardGroupService.get_or_none(db, current_user, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card group not found.")
    CardGroupService.delete(db, group)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{group_id}/cards", status_code=status.HTTP_204_NO_CONTENT)
def add_card_to_group(
    group_id: str,
    payload: AddCardToGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    group = CardGroupService.get_or_none(db, current_user, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card group not found.")
    try:
        CardGroupService.add_card(db, current_user, group=group, card_id=payload.card_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.") from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{group_id}/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_card_from_group(
    group_id: str,
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    group = CardGroupService.get_or_none(db, current_user, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card group not found.")
    CardGroupService.remove_card(db, group=group, card_id=card_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
