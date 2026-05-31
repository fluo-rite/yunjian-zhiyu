from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import CamelModel

UploadSourceType = Literal["document"]
UploadMode = Literal["direct", "multipart"]


class DirectUploadInitRequest(CamelModel):
    filename: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0)
    mime_type: str | None = Field(default=None, max_length=100)
    source_type: UploadSourceType


class DirectUploadInitResponse(CamelModel):
    object_key: str
    upload_url: str
    expires_in: int


class MultipartUploadInitRequest(CamelModel):
    filename: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0)
    mime_type: str | None = Field(default=None, max_length=100)
    source_type: UploadSourceType


class MultipartUploadInitResponse(CamelModel):
    object_key: str
    upload_id: str
    part_size: int
    total_parts: int


class MultipartPartUrlRequest(CamelModel):
    object_key: str = Field(min_length=1, max_length=500)
    upload_id: str = Field(min_length=1, max_length=255)
    part_number: int = Field(ge=1)
    mime_type: str | None = Field(default=None, max_length=100)


class MultipartPartUrlResponse(CamelModel):
    part_number: int
    upload_url: str
    expires_in: int


class CompletedUploadPart(CamelModel):
    part_number: int = Field(ge=1)
    etag: str = Field(min_length=1)


class CompleteUploadRequest(CamelModel):
    mode: UploadMode
    object_key: str = Field(min_length=1, max_length=500)
    filename: str = Field(min_length=1, max_length=255)
    mime_type: str | None = Field(default=None, max_length=100)
    source_type: UploadSourceType
    upload_id: str | None = Field(default=None, max_length=255)
    parts: list[CompletedUploadPart] | None = None

    @model_validator(mode="after")
    def validate_mode_fields(self) -> "CompleteUploadRequest":
        if self.mode == "multipart":
            if not self.upload_id:
                raise ValueError("uploadId is required for multipart uploads.")
            if not self.parts:
                raise ValueError("parts are required for multipart uploads.")
        return self


class CompleteUploadResponse(CamelModel):
    object_key: str
    size: int
    mime_type: str | None = None


class AbortMultipartUploadRequest(CamelModel):
    object_key: str = Field(min_length=1, max_length=500)
    upload_id: str = Field(min_length=1, max_length=255)
