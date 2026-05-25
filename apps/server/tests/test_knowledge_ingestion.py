from datetime import timedelta

from app.core.db import SessionLocal, utc_now
from app.models.chat import Chat
from app.models.knowledge_source import KnowledgeSource
from app.models.message import Message
from app.models.user import User
from app.services.knowledge_ingestion.pipeline import KnowledgeIngestionPipeline
from app.services.knowledge_ingestion.chunker import ChunkBuildService
from app.services.knowledge_ingestion.parse import DocumentParseError, DocumentParseService
from app.services.knowledge_ingestion.types import DocumentParseResult, GeneratedKnowledgeCardBatch, ParsedBlock, RuntimeChunk
from app.services.card_generation_service import process_knowledge_source_sync
from tests.test_health import client, create_user, install_source_runtime_test_doubles, reset_database


def test_document_chunking_degrades_to_sentence_level_for_long_paragraph() -> None:
    service = ChunkBuildService()
    long_paragraph = "这是一个很长的段落。" * 120
    blocks = [
        ParsedBlock(block_type="heading", text="缓存策略", level=1, heading_path=("缓存策略",)),
        ParsedBlock(
            block_type="paragraph",
            text=long_paragraph,
            heading_path=("缓存策略",),
        ),
    ]

    chunks = service._build_document_like_chunks("document", blocks)

    assert len(chunks) >= 2
    assert all(len(chunk.text) <= 1000 for chunk in chunks)
    assert all(chunk.current_heading == "缓存策略" for chunk in chunks)


def test_manual_text_chunking_prefers_paragraphs_then_sentences() -> None:
    service = ChunkBuildService()
    text = (
        "FastAPI 推荐使用 APIRouter 组织路由。这样模块更清晰。\n\n"
        + ("第二段内容。" * 180)
    )

    chunks = service._build_manual_text_chunks(text)

    assert len(chunks) >= 2
    assert chunks[0].source_type == "manual_text"
    assert all(len(chunk.text) <= 1000 for chunk in chunks)


def test_messages_chunking_groups_question_and_answer_turns() -> None:
    service = ChunkBuildService()

    class FakeSource:
        source_type = "messages"
        source_metadata = {
            "messages": [
                {"role": "user", "content": "第一个问题"},
                {"role": "user", "content": "补充问题描述"},
                {"role": "assistant", "content": "第一段回答"},
                {"role": "assistant", "content": "第二段回答"},
                {"role": "user", "content": "第二个问题"},
                {"role": "assistant", "content": "第二个回答"},
            ]
        }

    chunks = service._build_message_chunks(FakeSource())

    assert len(chunks) == 2
    assert chunks[0].question_text == "第一个问题\n补充问题描述"
    assert chunks[0].answer_text == "第一段回答\n第二段回答"
    assert chunks[1].question_text == "第二个问题"
    assert chunks[1].answer_text == "第二个回答"


def test_knowledge_source_from_messages_uses_message_ids(monkeypatch) -> None:
    reset_database()
    dispatcher = install_source_runtime_test_doubles(monkeypatch)
    headers = create_user("messages-source@example.com", "messages-source-user")

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "messages-source@example.com").one()
        chat = Chat(user_id=user.id, title="FastAPI 对话")
        db.add(chat)
        db.commit()
        db.refresh(chat)

        base_time = utc_now()
        records = [
            Message(
                chat_id=chat.id,
                role="user",
                status="done",
                content="FastAPI 路由怎么组织？",
                created_at=base_time,
                updated_at=base_time,
            ),
            Message(
                chat_id=chat.id,
                role="assistant",
                status="done",
                content="推荐使用 APIRouter 拆分路由。",
                created_at=base_time + timedelta(microseconds=1),
                updated_at=base_time + timedelta(microseconds=1),
            ),
            Message(
                chat_id=chat.id,
                role="user",
                status="done",
                content="依赖注入有什么好处？",
                created_at=base_time + timedelta(microseconds=2),
                updated_at=base_time + timedelta(microseconds=2),
            ),
            Message(
                chat_id=chat.id,
                role="assistant",
                status="done",
                content="可以把鉴权和数据库会话从 handler 中解耦。",
                created_at=base_time + timedelta(microseconds=3),
                updated_at=base_time + timedelta(microseconds=3),
            ),
        ]
        db.add_all(records)
        db.commit()
        message_ids = [record.id for record in records]

    create_response = client.post(
        "/api/v1/knowledge-sources/from-messages",
        headers=headers,
        json={
            "name": "FastAPI 对话摘录",
            "messageIds": message_ids,
        },
    )
    assert create_response.status_code == 202, create_response.text
    source_id = create_response.json()["id"]
    dispatcher.wait_for_idle()

    detail_response = client.get(f"/api/v1/knowledge-sources/{source_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["status"] == "ready"
    assert detail_response.json()["sourceMetadata"]["messageCount"] == 4
    assert detail_response.json()["sourceMetadata"]["messageIds"] == message_ids

    cards_response = client.get(f"/api/v1/knowledge-sources/{source_id}/cards", headers=headers)
    assert cards_response.status_code == 200
    assert len(cards_response.json()["items"]) == 4


def test_pdf_parse_falls_back_to_pypdf_when_docling_result_is_not_usable(monkeypatch) -> None:
    service = DocumentParseService()

    monkeypatch.setattr(
        service,
        "_try_docling",
        lambda _bytes: DocumentParseResult(blocks=[], parser_used="docling"),
    )
    monkeypatch.setattr(service, "_extract_pdf_text", lambda _bytes: "FastAPI routing basics")

    result = service.parse_document_bytes(
        filename="fastapi.pdf",
        mime_type="application/pdf",
        content_bytes=b"%PDF-fake",
    )

    assert result.parser_used == "pypdf"
    assert len(result.blocks) == 1


def test_pdf_parse_raises_when_docling_and_pypdf_both_fail(monkeypatch) -> None:
    service = DocumentParseService()

    monkeypatch.setattr(service, "_try_docling", lambda _bytes: None)
    monkeypatch.setattr(service, "_extract_pdf_text", lambda _bytes: "")

    try:
        service.parse_document_bytes(
            filename="fastapi.pdf",
            mime_type="application/pdf",
            content_bytes=b"%PDF-fake",
        )
    except DocumentParseError as error:
        assert str(error) == "Unable to extract usable text from the PDF."
    else:  # pragma: no cover
        raise AssertionError("Expected DocumentParseError for unusable PDF content.")


def test_parse_rejects_unsupported_binary_file() -> None:
    service = DocumentParseService()

    try:
        service.parse_document_bytes(
            filename="spreadsheet.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            content_bytes=b"PK\x03\x04fake-xlsx",
        )
    except DocumentParseError as error:
        assert str(error) == "Only pdf, txt, md, and markdown files are supported."
    else:  # pragma: no cover
        raise AssertionError("Expected DocumentParseError for unsupported file type.")


def test_parse_rejects_non_utf8_text_file() -> None:
    service = DocumentParseService()

    try:
        service.parse_document_bytes(
            filename="notes.txt",
            mime_type="text/plain",
            content_bytes=b"\xff\xfe\x00\x00",
        )
    except DocumentParseError as error:
        assert str(error) == "Unable to decode the uploaded text file as UTF-8."
    else:  # pragma: no cover
        raise AssertionError("Expected DocumentParseError for invalid UTF-8 text.")


def test_pipeline_marks_source_failed_when_no_chunks_are_produced(monkeypatch) -> None:
    reset_database()
    source_id: str

    with SessionLocal() as db:
        user = User(
            email="pipeline-empty-chunks@example.com",
            username="pipeline-empty-chunks-user",
            nickname="pipeline-empty-chunks-user",
            hashed_password="test-password",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        source = KnowledgeSource(
            user_id=user.id,
            name="Empty chunk source",
            source_type="manual_text",
            raw_content="ignored",
            status="processing",
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        source_id = source.id

    class FakeChunkBuildService:
        def build_chunks(self, **_kwargs):
            return []

    monkeypatch.setattr(
        "app.services.knowledge_ingestion.pipeline.get_chunk_build_service",
        lambda: FakeChunkBuildService(),
    )

    process_knowledge_source_sync(source_id)

    with SessionLocal() as db:
        source = db.get(KnowledgeSource, source_id)
        assert source is not None
        db.refresh(source)

        assert source.status == "failed"
        assert source.failure_reason == "No usable content chunks were produced from the source."
        assert source.processing_meta["chunkCount"] == 0
        assert source.processing_meta["finalCardCount"] == 0


def test_pipeline_marks_source_failed_when_no_cards_are_generated(monkeypatch) -> None:
    reset_database()

    with SessionLocal() as db:
        user = User(
            email="pipeline-empty-cards@example.com",
            username="pipeline-empty-cards-user",
            nickname="pipeline-empty-cards-user",
            hashed_password="test-password",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        source = KnowledgeSource(
            user_id=user.id,
            name="Empty card source",
            source_type="manual_text",
            raw_content="ignored",
            status="processing",
        )
        db.add(source)
        db.commit()
        db.refresh(source)

        class FakeChunkBuildService:
            def build_chunks(self, **_kwargs):
                return [RuntimeChunk(chunk_id="chunk-1", source_type="manual_text", text="FastAPI basics")]

        class FakeGenerationService:
            def generate_cards_for_chunk(self, **_kwargs):
                return GeneratedKnowledgeCardBatch(cards=[])

            def generate_cards_for_chunks(self, *, chunks: list, **_kwargs):
                return [GeneratedKnowledgeCardBatch(cards=[]) for _ in chunks]

        monkeypatch.setattr(
            "app.services.knowledge_ingestion.pipeline.get_chunk_build_service",
            lambda: FakeChunkBuildService(),
        )
        monkeypatch.setattr(
            "app.services.card_generation_service.get_card_generation_service",
            lambda: FakeGenerationService(),
        )

        KnowledgeIngestionPipeline().process_source(db, source)
        db.commit()
        db.refresh(source)

        assert source.status == "failed"
        assert source.failure_reason == "No knowledge cards were generated from the source content."
        assert source.processing_meta["chunkCount"] == 1
        assert source.processing_meta["generatedCardCount"] == 0
        assert source.processing_meta["finalCardCount"] == 0
