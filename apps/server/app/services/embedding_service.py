from __future__ import annotations

from functools import lru_cache
from importlib import import_module
from typing import Any

from app.core.config import get_settings
from app.core.constants import EMBEDDING_VECTOR_DIMENSION


class EmbeddingServiceConfigurationError(RuntimeError):
    pass


class EmbeddingService:
    def __init__(self) -> None:
        settings = get_settings()
        api_key = settings.embedding_api_key
        model = settings.embedding_model
        if not api_key or not model:
            raise EmbeddingServiceConfigurationError("Embedding service is not configured.")

        self._dashscope_module: Any | None = None
        self._api_key = api_key
        self.model_name = model

    def _get_dashscope_module(self) -> Any:
        if self._dashscope_module is None:
            try:
                self._dashscope_module = import_module("dashscope")
            except ImportError as error:  # pragma: no cover - local dependency issue
                raise EmbeddingServiceConfigurationError(
                    "DashScope SDK is not installed. Please install the 'dashscope' package."
                ) from error
        return self._dashscope_module

    def _extract_embedding_vector(self, response: Any) -> list[float]:
        status_code = getattr(response, "status_code", None)
        if status_code is not None and int(status_code) >= 400:
            message = getattr(response, "message", None) or getattr(response, "code", None) or response
            raise RuntimeError(f"DashScope embedding request failed: {message}")

        output = getattr(response, "output", None)
        if output is None and isinstance(response, dict):
            output = response.get("output")
        if output is None:
            raise RuntimeError("DashScope embedding response does not contain output.")

        embeddings = None
        if isinstance(output, dict):
            embeddings = output.get("embeddings")
        else:
            embeddings = getattr(output, "embeddings", None)
        if not embeddings:
            raise RuntimeError("DashScope embedding response does not contain embeddings.")

        first_item = embeddings[0]
        if isinstance(first_item, dict):
            vector = first_item.get("embedding")
        else:
            vector = getattr(first_item, "embedding", None)
        if not vector:
            raise RuntimeError("DashScope embedding response does not contain an embedding vector.")

        normalized = [float(value) for value in vector]
        if len(normalized) != EMBEDDING_VECTOR_DIMENSION:
            raise RuntimeError(
                "DashScope embedding dimension mismatch: "
                f"expected {EMBEDDING_VECTOR_DIMENSION}, got {len(normalized)}."
            )
        return normalized

    def _embed_text(self, text: str) -> list[float]:
        normalized = text.strip()
        if not normalized:
            raise ValueError("Embedding text cannot be empty.")

        dashscope = self._get_dashscope_module()
        response = dashscope.MultiModalEmbedding.call(
            api_key=self._api_key,
            model=self.model_name,
            input=[{"text": normalized}],
            dimension=EMBEDDING_VECTOR_DIMENSION,
        )
        return self._extract_embedding_vector(response)

    def embed_content(self, content: str) -> list[float]:
        return self._embed_text(content)

    def embed_query(self, query: str) -> list[float]:
        return self._embed_text(query)


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
