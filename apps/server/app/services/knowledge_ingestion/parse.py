from __future__ import annotations

from io import BytesIO
import re

from pypdf import PdfReader

from app.models.knowledge_source import KnowledgeSource
from app.services.knowledge_ingestion.types import DocumentParseResult, ParsedBlock

_SUPPORTED_TEXT_EXTENSIONS = (".txt", ".md", ".markdown")
_SUPPORTED_TEXT_MIME_TYPES = (
    "text/plain",
    "text/markdown",
    "text/x-markdown",
)


class DocumentParseError(RuntimeError):
    pass


class DocumentParseService:
    def parse_document_bytes(
        self,
        *,
        filename: str,
        mime_type: str | None,
        content_bytes: bytes,
    ) -> DocumentParseResult:
        normalized_mime = (mime_type or "").lower()
        lowered_filename = filename.lower()

        if normalized_mime == "application/pdf" or lowered_filename.endswith(".pdf"):
            return self._parse_pdf(content_bytes)

        if (
            normalized_mime in _SUPPORTED_TEXT_MIME_TYPES
            or lowered_filename.endswith(_SUPPORTED_TEXT_EXTENSIONS)
        ):
            return self._parse_text_file(content_bytes)

        raise DocumentParseError("Only pdf, txt, md, and markdown files are supported.")

    def parse_stored_document(self, source: KnowledgeSource) -> DocumentParseResult:
        metadata = source.source_metadata or {}
        stored_blocks = metadata.get("parsedBlocks")
        parser_used = str(metadata.get("parserUsed") or "stored_text")
        if isinstance(stored_blocks, list):
            blocks = [
                ParsedBlock.from_metadata(item)
                for item in stored_blocks
                if isinstance(item, dict)
            ]
            if blocks:
                return DocumentParseResult(blocks=blocks, parser_used=parser_used)
        return DocumentParseResult(
            blocks=self._blocks_from_text(source.raw_content),
            parser_used="stored_text",
        )

    @staticmethod
    def _extract_pdf_text(content_bytes: bytes) -> str:
        reader = PdfReader(BytesIO(content_bytes))
        return "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()

    def _parse_pdf(self, content_bytes: bytes) -> DocumentParseResult:
        docling_result = self._try_docling(content_bytes)
        if self._is_usable_result(docling_result):
            return docling_result

        text = self._extract_pdf_text(content_bytes)
        pypdf_result = DocumentParseResult(
            blocks=self._blocks_from_text(text),
            parser_used="pypdf",
        )
        if self._is_usable_result(pypdf_result):
            return pypdf_result

        raise DocumentParseError("Unable to extract usable text from the PDF.")

    def _parse_text_file(self, content_bytes: bytes) -> DocumentParseResult:
        try:
            decoded = content_bytes.decode("utf-8")
        except UnicodeDecodeError as error:
            raise DocumentParseError("Unable to decode the uploaded text file as UTF-8.") from error

        result = DocumentParseResult(
            blocks=self._blocks_from_text(decoded),
            parser_used="utf8_text",
        )
        if self._is_usable_result(result):
            return result
        raise DocumentParseError("Unable to extract usable text from the uploaded file.")

    def _try_docling(self, content_bytes: bytes) -> DocumentParseResult | None:
        try:
            from docling.document_converter import DocumentConverter  # type: ignore[import-not-found]
        except Exception:
            return None

        try:
            converter = DocumentConverter()
            result = converter.convert(BytesIO(content_bytes))
            markdown = getattr(result.document, "export_to_markdown", lambda: "")()
            blocks = self._blocks_from_text(markdown)
            return DocumentParseResult(blocks=blocks, parser_used="docling")
        except Exception:
            return None

    def _blocks_from_text(self, text: str) -> list[ParsedBlock]:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not normalized:
            return []

        blocks: list[ParsedBlock] = []
        heading_stack: list[str] = []

        for raw_block in re.split(r"\n\s*\n+", normalized):
            block = raw_block.strip()
            if not block:
                continue

            if self._looks_like_heading(block):
                level = self._infer_heading_level(block)
                heading_stack = heading_stack[: max(level - 1, 0)]
                heading_stack.append(block)
                blocks.append(
                    ParsedBlock(
                        block_type="heading",
                        text=block,
                        level=level,
                        heading_path=tuple(heading_stack),
                    )
                )
                continue

            lines = [line.strip() for line in block.splitlines() if line.strip()]
            if lines and all(self._looks_like_list_item(line) for line in lines):
                for line in lines:
                    blocks.append(
                        ParsedBlock(
                            block_type="list_item",
                            text=line,
                            heading_path=tuple(heading_stack),
                        )
                    )
                continue

            blocks.append(
                ParsedBlock(
                    block_type="paragraph",
                    text=block,
                    heading_path=tuple(heading_stack),
                )
            )
        return blocks

    @staticmethod
    def _looks_like_heading(text: str) -> bool:
        compact = text.strip()
        if not compact:
            return False
        if len(compact) > 40:
            return False
        if compact.endswith(("。", "！", "？", ".", "!", "?", ";", "；", ":")):
            return False
        if "\n" in compact:
            return False
        return bool(
            re.match(r"^(#{1,6}\s+.+|第[一二三四五六七八九十0-9]+[章节部分篇].*|\d+(\.\d+)*\s+\S+)", compact)
            or not re.search(r"[。！？]", compact)
        )

    @staticmethod
    def _infer_heading_level(text: str) -> int:
        stripped = text.strip()
        if stripped.startswith("#"):
            return min(len(stripped.split(" ", 1)[0]), 6)
        numeric_match = re.match(r"^(\d+(?:\.\d+)*)\s+", stripped)
        if numeric_match:
            return numeric_match.group(1).count(".") + 1
        if stripped.startswith("第"):
            return 1
        return 1

    @staticmethod
    def _looks_like_list_item(line: str) -> bool:
        return bool(re.match(r"^([-*•]|\d+[.)、])\s*", line))

    @staticmethod
    def _is_usable_result(result: DocumentParseResult | None) -> bool:
        if result is None:
            return False
        merged_text = "".join(block.text.strip() for block in result.blocks if block.text.strip())
        if len(merged_text) < 8:
            return False
        return bool(re.search(r"[A-Za-z0-9\u4e00-\u9fff]", merged_text))


_service: DocumentParseService | None = None


def get_document_parse_service() -> DocumentParseService:
    global _service
    if _service is None:
        _service = DocumentParseService()
    return _service
