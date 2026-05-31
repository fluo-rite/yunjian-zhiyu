from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.upload import (
    AbortMultipartUploadRequest,
    CompleteUploadRequest,
    CompleteUploadResponse,
    DirectUploadInitRequest,
    DirectUploadInitResponse,
    MultipartPartUrlRequest,
    MultipartPartUrlResponse,
    MultipartUploadInitRequest,
    MultipartUploadInitResponse,
)
from app.services.storage import (
    ObjectStorageConfigurationError,
    ObjectStorageOwnershipError,
    ObjectStorageValidationError,
    get_object_storage_service,
)

router = APIRouter(prefix="/uploads", tags=["uploads"])


def _raise_storage_http_error(error: RuntimeError) -> None:
    if isinstance(error, ObjectStorageOwnershipError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    if isinstance(error, ObjectStorageValidationError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    if isinstance(error, ObjectStorageConfigurationError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Object storage is not configured.",
        ) from error
    raise error


@router.post("/direct/init", response_model=DirectUploadInitResponse)
def init_direct_upload(
    payload: DirectUploadInitRequest,
    current_user: User = Depends(get_current_user),
) -> DirectUploadInitResponse:
    try:
        return DirectUploadInitResponse.model_validate(
            get_object_storage_service().init_direct_upload(
                user_id=current_user.id,
                filename=payload.filename,
                size=payload.size,
                mime_type=payload.mime_type,
                source_type=payload.source_type,
            )
        )
    except RuntimeError as error:
        _raise_storage_http_error(error)


@router.post("/multipart/init", response_model=MultipartUploadInitResponse)
def init_multipart_upload(
    payload: MultipartUploadInitRequest,
    current_user: User = Depends(get_current_user),
) -> MultipartUploadInitResponse:
    try:
        return MultipartUploadInitResponse.model_validate(
            get_object_storage_service().init_multipart_upload(
                user_id=current_user.id,
                filename=payload.filename,
                size=payload.size,
                mime_type=payload.mime_type,
                source_type=payload.source_type,
            )
        )
    except RuntimeError as error:
        _raise_storage_http_error(error)


@router.post("/multipart/part-url", response_model=MultipartPartUrlResponse)
def get_multipart_part_url(
    payload: MultipartPartUrlRequest,
    current_user: User = Depends(get_current_user),
) -> MultipartPartUrlResponse:
    try:
        return MultipartPartUrlResponse.model_validate(
            get_object_storage_service().sign_multipart_part_url(
                user_id=current_user.id,
                object_key=payload.object_key,
                upload_id=payload.upload_id,
                part_number=payload.part_number,
                mime_type=payload.mime_type,
            )
        )
    except RuntimeError as error:
        _raise_storage_http_error(error)


@router.post("/complete", response_model=CompleteUploadResponse)
def complete_upload(
    payload: CompleteUploadRequest,
    current_user: User = Depends(get_current_user),
) -> CompleteUploadResponse:
    try:
        return CompleteUploadResponse.model_validate(
            get_object_storage_service().complete_upload(
                user_id=current_user.id,
                object_key=payload.object_key,
                source_type=payload.source_type,
                mode=payload.mode,
                upload_id=payload.upload_id,
                parts=[part.model_dump() for part in payload.parts or []],
            )
        )
    except RuntimeError as error:
        _raise_storage_http_error(error)


@router.post("/abort", status_code=status.HTTP_204_NO_CONTENT)
def abort_upload(
    payload: AbortMultipartUploadRequest,
    current_user: User = Depends(get_current_user),
) -> Response:
    try:
        get_object_storage_service().abort_upload(
            user_id=current_user.id,
            object_key=payload.object_key,
            upload_id=payload.upload_id,
        )
    except RuntimeError as error:
        _raise_storage_http_error(error)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
