from __future__ import annotations

from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from app.core.config import get_settings


class EmbeddingServiceConfigurationError(RuntimeError):
    pass


class EmbeddingService:
    def __init__(self) -> None:
        settings = get_settings()
        base_url = settings.embedding_base_url
        api_key = settings.embedding_api_key
        model = settings.embedding_model
        if not base_url or not api_key or not model:
            raise EmbeddingServiceConfigurationError("Embedding service is not configured.")

        self._client = OpenAIEmbeddings(
            model=model,
            api_key=api_key,
            base_url=base_url,
        )
        self.model_name = model

    def embed_content(self, content: str) -> list[float]:
        return self._client.embed_query(content.strip())

    def embed_query(self, query: str) -> list[float]:
        return self._client.embed_query(query.strip())


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
