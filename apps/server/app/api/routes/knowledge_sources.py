from __future__ import annotations

from typing import get_args

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.knowledge_source import (
    CreateKnowledgeSourceFromMessagesRequest,
    CreateKnowledgeSourceFromTextRequest,
    DeleteKnowledgeSourceRequest,
    KnowledgeSourceCardsResponse,
    KnowledgeSourceDeletePreviewResponse,
    KnowledgeSourceDetailRead,
    KnowledgeSourceListResponse,
    KnowledgeSourceRead,
    KnowledgeSourceStatus,
)
from app.services.knowledge_source_service import (
    KnowledgeSourceNotFoundError,
    KnowledgeSourceService,
)

router = APIRouter(prefix="/knowledge-sources", tags=["knowledge-sources"])

SOURCE_STATUS_VALUES = get_args(KnowledgeSourceStatus)
SOURCE_TYPE_VALUES = ("manual_text", "document", "messages")


@router.post("/from-text", response_model=KnowledgeSourceRead, status_code=status.HTTP_202_ACCEPTED)
async def create_source_from_text(
    payload: CreateKnowledgeSourceFromTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSourceRead:
    return await KnowledgeSourceService.create_from_text(db, current_user, payload)


@router.post(
    "/from-messages",
    response_model=KnowledgeSourceRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_source_from_messages(
    payload: CreateKnowledgeSourceFromMessagesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSourceRead:
    return await KnowledgeSourceService.create_from_messages(db, current_user, payload)


@router.post(
    "/from-document",
    response_model=KnowledgeSourceRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_source_from_document(
    name: str = Form(..., min_length=1, max_length=200),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSourceRead:
    content_bytes = await file.read()
    return await KnowledgeSourceService.create_from_document(
        db,
        current_user,
        name=name,
        filename=file.filename or "document",
        mime_type=file.content_type,
        content_bytes=content_bytes,
    )


@router.get("", response_model=KnowledgeSourceListResponse)
def list_sources(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None, json_schema_extra={"enum": list(SOURCE_STATUS_VALUES)}),
    source_type: str | None = Query(default=None, json_schema_extra={"enum": list(SOURCE_TYPE_VALUES)}),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSourceListResponse:
    return KnowledgeSourceService.list(
        db,
        current_user,
        page=page,
        page_size=page_size,
        status=status,
        source_type=source_type,
    )


@router.get("/{source_id}", response_model=KnowledgeSourceDetailRead)
def get_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSourceDetailRead:
    try:
        return KnowledgeSourceService.detail(db, current_user, source_id)
    except KnowledgeSourceNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge source not found.") from None


@router.get("/{source_id}/cards", response_model=KnowledgeSourceCardsResponse)
def list_source_cards(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSourceCardsResponse:
    try:
        return KnowledgeSourceService.list_cards(db, current_user, source_id)
    except KnowledgeSourceNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge source not found.") from None


@router.get("/{source_id}/delete-preview", response_model=KnowledgeSourceDeletePreviewResponse)
def get_delete_preview(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KnowledgeSourceDeletePreviewResponse:
    try:
        return KnowledgeSourceService.delete_preview(db, current_user, source_id)
    except KnowledgeSourceNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge source not found.") from None


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: str,
    payload: DeleteKnowledgeSourceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    try:
        KnowledgeSourceService.delete(db, current_user, source_id, payload)
    except KnowledgeSourceNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge source not found.") from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
