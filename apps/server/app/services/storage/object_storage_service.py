from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any
from uuid import uuid4

try:
    import oss2
    from oss2.models import PartInfo
except ModuleNotFoundError:  # pragma: no cover - exercised only in environments without oss2 installed.
    oss2 = None  # type: ignore[assignment]
    PartInfo = Any  # type: ignore[misc,assignment]

from app.core.config import get_settings

DIRECT_UPLOAD_EXPIRES_IN_SECONDS = 60 * 10
MULTIPART_PART_UPLOAD_EXPIRES_IN_SECONDS = 60 * 60
UPLOAD_MODE_THRESHOLD = 20 * 1024 * 1024
MULTIPART_UPLOAD_MAX_SIZE = 500 * 1024 * 1024
DEFAULT_MULTIPART_PART_SIZE = 5 * 1024 * 1024
SUPPORTED_UPLOAD_SOURCE_TYPES = {"document"}


class ObjectStorageConfigurationError(RuntimeError):
    pass


class ObjectStorageOwnershipError(RuntimeError):
    pass


class ObjectStorageValidationError(RuntimeError):
    pass


@dataclass(slots=True)
class DirectUploadPlan:
    object_key: str
    upload_url: str
    expires_in: int


@dataclass(slots=True)
class MultipartUploadPlan:
    object_key: str
    upload_id: str
    part_size: int
    total_parts: int


@dataclass(slots=True)
class SignedPartUpload:
    part_number: int
    upload_url: str
    expires_in: int


@dataclass(slots=True)
class CompletedUpload:
    object_key: str
    size: int
    mime_type: str | None


class ObjectStorageService:
    def __init__(self) -> None:
        if oss2 is None:
            raise ObjectStorageConfigurationError(
                "OSS SDK dependency is not installed. Add the 'oss2' package to the server environment."
            )

        settings = get_settings()
        missing = [
            name
            for name, value in (
                ("oss_endpoint", settings.oss_endpoint),
                ("oss_bucket", settings.oss_bucket),
                ("oss_access_key_id", settings.oss_access_key_id),
                ("oss_access_key_secret", settings.oss_access_key_secret),
            )
            if not (value or "").strip()
        ]
        if missing:
            raise ObjectStorageConfigurationError(
                f"OSS is not configured. Missing: {', '.join(missing)}."
            )

        self._endpoint = str(settings.oss_endpoint).strip()
        self._bucket_name = str(settings.oss_bucket).strip()
        self._region = (settings.oss_region or "").strip() or None
        self._bucket = oss2.Bucket(
            auth=oss2.AuthV4(
                str(settings.oss_access_key_id).strip(),
                str(settings.oss_access_key_secret).strip(),
            ),
            endpoint=self._endpoint,
            bucket_name=self._bucket_name,
            region=self._region,
        )

    def init_direct_upload(
        self,
        *,
        user_id: str,
        filename: str,
        size: int,
        mime_type: str | None,
        source_type: str,
    ) -> DirectUploadPlan:
        self._assert_supported_source_type(source_type)
        self._assert_direct_upload(size)
        object_key = self._create_object_key(user_id=user_id, filename=filename, source_type=source_type)
        headers = self._build_headers(mime_type)
        upload_url = self._bucket.sign_url(
            "PUT",
            object_key,
            DIRECT_UPLOAD_EXPIRES_IN_SECONDS,
            headers=headers or None,
            slash_safe=True,
        )
        return DirectUploadPlan(
            object_key=object_key,
            upload_url=upload_url,
            expires_in=DIRECT_UPLOAD_EXPIRES_IN_SECONDS,
        )

    def init_multipart_upload(
        self,
        *,
        user_id: str,
        filename: str,
        size: int,
        mime_type: str | None,
        source_type: str,
    ) -> MultipartUploadPlan:
        self._assert_supported_source_type(source_type)
        self._assert_multipart_upload(size)
        object_key = self._create_object_key(user_id=user_id, filename=filename, source_type=source_type)
        result = self._bucket.init_multipart_upload(
            object_key,
            headers=self._build_headers(mime_type) or None,
        )
        return MultipartUploadPlan(
            object_key=object_key,
            upload_id=result.upload_id,
            part_size=DEFAULT_MULTIPART_PART_SIZE,
            total_parts=(size + DEFAULT_MULTIPART_PART_SIZE - 1) // DEFAULT_MULTIPART_PART_SIZE,
        )

    def sign_multipart_part_url(
        self,
        *,
        user_id: str,
        object_key: str,
        upload_id: str,
        part_number: int,
    ) -> SignedPartUpload:
        if part_number <= 0:
            raise ObjectStorageValidationError("partNumber must be greater than 0.")
        self.assert_owned_object_key(object_key=object_key, user_id=user_id, source_type="document")
        upload_url = self._bucket.sign_url(
            "PUT",
            object_key,
            MULTIPART_PART_UPLOAD_EXPIRES_IN_SECONDS,
            params={
                "partNumber": str(part_number),
                "uploadId": upload_id,
            },
            slash_safe=True,
        )
        return SignedPartUpload(
            part_number=part_number,
            upload_url=upload_url,
            expires_in=MULTIPART_PART_UPLOAD_EXPIRES_IN_SECONDS,
        )

    def complete_upload(
        self,
        *,
        user_id: str,
        object_key: str,
        source_type: str,
        mode: str,
        upload_id: str | None,
        parts: list[dict[str, object]] | None,
    ) -> CompletedUpload:
        self._assert_supported_source_type(source_type)
        self.assert_owned_object_key(object_key=object_key, user_id=user_id, source_type=source_type)

        if mode == "multipart":
            if not upload_id:
                raise ObjectStorageValidationError("uploadId is required for multipart uploads.")
            if not parts:
                raise ObjectStorageValidationError("parts are required for multipart uploads.")
            normalized_parts = []
            for item in parts:
                part_number = int(item["partNumber"])
                etag = str(item["etag"])
                normalized_parts.append(PartInfo(part_number, etag))
            normalized_parts.sort(key=lambda item: item.part_number)
            self._bucket.complete_multipart_upload(object_key, upload_id, normalized_parts)
        elif mode != "direct":
            raise ObjectStorageValidationError("Unsupported upload mode.")

        head_result = self._bucket.head_object(object_key)
        headers = getattr(head_result, "headers", {}) or {}
        size = int(headers.get("Content-Length") or 0)
        if size <= 0:
            raise ObjectStorageValidationError("Uploaded object is empty.")
        mime_type = headers.get("Content-Type")
        return CompletedUpload(
            object_key=object_key,
            size=size,
            mime_type=mime_type,
        )

    def abort_upload(
        self,
        *,
        user_id: str,
        object_key: str,
        upload_id: str,
    ) -> None:
        self.assert_owned_object_key(object_key=object_key, user_id=user_id, source_type="document")
        self._bucket.abort_multipart_upload(object_key, upload_id)

    def download_object_bytes(
        self,
        *,
        user_id: str,
        object_key: str,
        source_type: str,
    ) -> bytes:
        self.assert_owned_object_key(object_key=object_key, user_id=user_id, source_type=source_type)
        return self._bucket.get_object(object_key).read()

    def delete_object(
        self,
        *,
        user_id: str,
        object_key: str,
        source_type: str,
    ) -> None:
        self.assert_owned_object_key(object_key=object_key, user_id=user_id, source_type=source_type)
        try:
            self._bucket.delete_object(object_key)
        except oss2.exceptions.OssError as error:
            status = getattr(error, "status", None)
            if status == 404:
                return
            raise

    def assert_owned_object_key(self, *, object_key: str, user_id: str, source_type: str) -> None:
        self._assert_supported_source_type(source_type)
        expected_prefix = self._build_object_prefix(user_id=user_id, source_type=source_type)
        if not object_key.startswith(expected_prefix):
            raise ObjectStorageOwnershipError("You do not have access to this uploaded object.")

    @staticmethod
    def _sanitize_extension(filename: str) -> str:
        return "".join(ch for ch in Path(filename).suffix.lower() if ch.isalnum() or ch in {".", "_", "-"})

    def _create_object_key(self, *, user_id: str, filename: str, source_type: str) -> str:
        extension = self._sanitize_extension(filename)
        prefix = self._build_object_prefix(user_id=user_id, source_type=source_type)
        return f"{prefix}{uuid4().hex}{extension}"

    @staticmethod
    def _build_headers(mime_type: str | None) -> dict[str, str]:
        normalized = (mime_type or "").strip()
        if not normalized:
            return {}
        return {"Content-Type": normalized}

    @staticmethod
    def _build_object_prefix(*, user_id: str, source_type: str) -> str:
        return f"knowledge_sources/{user_id}/{source_type}/"

    @staticmethod
    def _assert_direct_upload(size: int) -> None:
        if size <= 0:
            raise ObjectStorageValidationError("File size must be greater than 0.")
        if size > UPLOAD_MODE_THRESHOLD:
            raise ObjectStorageValidationError("Direct upload files cannot exceed 20MB.")

    @staticmethod
    def _assert_multipart_upload(size: int) -> None:
        if size <= UPLOAD_MODE_THRESHOLD:
            raise ObjectStorageValidationError("Files of 20MB or less should use direct upload.")
        if size > MULTIPART_UPLOAD_MAX_SIZE:
            raise ObjectStorageValidationError("Multipart upload files cannot exceed 500MB.")

    @staticmethod
    def _assert_supported_source_type(source_type: str) -> None:
        if source_type not in SUPPORTED_UPLOAD_SOURCE_TYPES:
            raise ObjectStorageValidationError("Unsupported upload source type.")


@lru_cache
def get_object_storage_service() -> ObjectStorageService:
    return ObjectStorageService()
