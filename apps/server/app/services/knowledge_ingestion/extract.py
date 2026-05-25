from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.knowledge_ingestion.prompt_builder import build_card_extraction_prompt
from app.services.knowledge_ingestion.types import GeneratedKnowledgeCardBatch, RuntimeChunk

MAX_PARALLEL_CARD_EXTRACTION_REQUESTS = 4


class CardExtractionConfigurationError(RuntimeError):
    pass


class CardExtractionService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.llm_base_url or not settings.llm_api_key or not settings.llm_model:
            raise CardExtractionConfigurationError("LLM is not configured.")
        self._model = ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout_seconds,
            temperature=0.2,
            max_retries=2,
        ).with_structured_output(GeneratedKnowledgeCardBatch)

    def generate_cards_for_chunk(self, *, source_name: str, chunk: RuntimeChunk) -> GeneratedKnowledgeCardBatch:
        return self._model.invoke(build_card_extraction_prompt(source_name=source_name, chunk=chunk))

    def generate_cards_for_chunks(
        self,
        *,
        source_name: str,
        chunks: list[RuntimeChunk],
    ) -> list[GeneratedKnowledgeCardBatch]:
        if not chunks:
            return []

        if len(chunks) == 1:
            return [self.generate_cards_for_chunk(source_name=source_name, chunk=chunks[0])]

        max_workers = min(MAX_PARALLEL_CARD_EXTRACTION_REQUESTS, len(chunks))
        results: list[GeneratedKnowledgeCardBatch | None] = [None] * len(chunks)

        with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="card-extract") as executor:
            future_to_index = {
                executor.submit(self.generate_cards_for_chunk, source_name=source_name, chunk=chunk): index
                for index, chunk in enumerate(chunks)
            }
            for future in as_completed(future_to_index):
                index = future_to_index[future]
                results[index] = future.result()

        return [result for result in results if result is not None]


@lru_cache
def get_card_generation_service() -> CardExtractionService:
    return CardExtractionService()
