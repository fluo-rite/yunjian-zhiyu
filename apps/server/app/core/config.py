from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Yunjian Zhiyu API"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    database_url: str
    redis_url: str
    arq_queue_name: str = "chat-generation"
    stream_ttl_seconds: int = 600
    secret_key: str = "change-me-change-me-change-me-32chars"
    access_token_expire_minutes: int = 60 * 24 * 7
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @field_validator("database_url", "redis_url", mode="before")
    @classmethod
    def validate_required_urls(cls, value: str | None, info) -> str:
        normalized = (value or "").strip()
        if not normalized:
            raise ValueError(f"{info.field_name} is required.")
        return normalized


@lru_cache
def get_settings() -> Settings:
    return Settings()
