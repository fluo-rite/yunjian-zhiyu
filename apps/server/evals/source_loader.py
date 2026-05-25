from __future__ import annotations

from dataclasses import dataclass
import mimetypes
from pathlib import Path

from sqlalchemy import select, update

from app.core.db import SessionLocal
from app.models.card import KnowledgeCard
from app.models.knowledge_source import KnowledgeSource
from app.models.user import User
from app.services.card_generation_service import process_knowledge_source_sync
from app.services.knowledge_ingestion.parse import get_document_parse_service


_SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown"}
_DEFAULT_EVAL_USER_EMAIL = "evals@example.local"


@dataclass(slots=True)
class SyncedSourceRecord:
    source_id: str
    relative_path: str
    name: str


@dataclass(slots=True)
class SourceDirectorySyncResult:
    user_id: str
    user_email: str
    sources: list[SyncedSourceRecord]


def sync_sources_from_directory(
    *,
    source_dir: Path,
    user_email: str | None = None,
    process_sources: bool = True,
    activate_cards: bool = True,
) -> SourceDirectorySyncResult:
    resolved_dir = source_dir.resolve()
    if not resolved_dir.exists() or not resolved_dir.is_dir():
        raise RuntimeError(f"Source directory does not exist or is not a directory: {resolved_dir}")

    file_paths = sorted(
        path for path in resolved_dir.rglob("*") if path.is_file() and path.suffix.lower() in _SUPPORTED_EXTENSIONS
    )
    if not file_paths:
        raise RuntimeError(f"No supported source files were found under: {resolved_dir}")

    db = SessionLocal()
    try:
        user = _ensure_eval_user(db, user_email or _DEFAULT_EVAL_USER_EMAIL)
        existing_sources = (
            db.execute(
                select(KnowledgeSource).where(
                    KnowledgeSource.user_id == user.id,
                    KnowledgeSource.source_type == "document",
                )
            )
            .scalars()
            .all()
        )
        source_by_locator = {
            str((source.source_metadata or {}).get("evalRelativePath")): source
            for source in existing_sources
            if (source.source_metadata or {}).get("evalRelativePath")
        }

        parse_service = get_document_parse_service()
        synced_sources: list[KnowledgeSource] = []
        for file_path in file_paths:
            relative_path = file_path.relative_to(resolved_dir).as_posix()
            mime_type = mimetypes.guess_type(file_path.name)[0]
            parsed = parse_service.parse_document_bytes(
                filename=file_path.name,
                mime_type=mime_type,
                content_bytes=file_path.read_bytes(),
            )
            raw_content = "\n\n".join(block.text for block in parsed.blocks if block.text.strip()).strip()
            metadata = {
                "filename": file_path.name,
                "mimeType": mime_type,
                "parserUsed": parsed.parser_used,
                "parsedBlocks": [block.to_metadata() for block in parsed.blocks],
                "evalRelativePath": relative_path,
                "evalSourceDir": resolved_dir.name,
            }

            existing = source_by_locator.get(relative_path)
            if existing is None:
                source = KnowledgeSource(
                    user_id=user.id,
                    name=file_path.stem,
                    source_type="document",
                    raw_content=raw_content,
                    status="processing",
                    source_metadata=metadata,
                )
                db.add(source)
                synced_sources.append(source)
            else:
                existing.name = file_path.stem
                existing.raw_content = raw_content
                existing.status = "processing"
                existing.failure_reason = None
                existing.processing_meta = None
                existing.source_metadata = metadata
                db.add(existing)
                synced_sources.append(existing)

        db.commit()
        for source in synced_sources:
            db.refresh(source)
    finally:
        db.close()

    if process_sources:
        for source in synced_sources:
            process_knowledge_source_sync(source.id)

    if activate_cards and synced_sources:
        db = SessionLocal()
        try:
            db.execute(
                update(KnowledgeCard)
                .where(
                    KnowledgeCard.user_id == synced_sources[0].user_id,
                    KnowledgeCard.source_id.in_([source.id for source in synced_sources]),
                    KnowledgeCard.status == "pending",
                )
                .values(status="active")
            )
            db.commit()
        finally:
            db.close()

    return SourceDirectorySyncResult(
        user_id=synced_sources[0].user_id,
        user_email=user_email or _DEFAULT_EVAL_USER_EMAIL,
        sources=[
            SyncedSourceRecord(
                source_id=source.id,
                relative_path=str((source.source_metadata or {}).get("evalRelativePath")),
                name=source.name,
            )
            for source in synced_sources
        ],
    )


def _ensure_eval_user(db, email: str) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is not None:
        return user

    user = User(
        email=email,
        username=None,
        nickname="Eval User",
        auth_provider="local",
        hashed_password="!",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
