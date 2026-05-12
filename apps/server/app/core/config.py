from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_URL = f"sqlite:///{(BASE_DIR / 'yunjian_zhiyu.db').as_posix()}"


class Settings(BaseSettings):
    app_name: str = "Yunjian Zhiyu API"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    database_url: str = DEFAULT_DATABASE_URL
    secret_key: str = "change-me-change-me-change-me-32chars"
    access_token_expire_minutes: int = 60 * 24 * 7
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "local-fallback"
    llm_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def ensure_database_url(self) -> "Settings":
        if not self.database_url:
            self.database_url = DEFAULT_DATABASE_URL
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
