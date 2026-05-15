from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


def _mask_secret(value: str | None) -> str | None:
    if value is None:
        return None
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}***{value[-4:]}"


def _mask_url_credentials(value: str) -> str:
    parts = urlsplit(value)
    if parts.username is None:
        return value

    auth = parts.username
    if parts.password is not None:
        auth = f"{auth}:***"

    host = parts.hostname or ""
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"

    netloc = auth
    if host:
        netloc = f"{netloc}@{host}"
    if parts.port is not None:
        netloc = f"{netloc}:{parts.port}"

    return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))


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

    def startup_log_payload(self) -> dict[str, object]:
        return {
            "appName": self.app_name,
            "debug": self.debug,
            "apiV1Prefix": self.api_v1_prefix,
            "envFile": str(BASE_DIR / ".env"),
            "databaseUrl": _mask_url_credentials(self.database_url),
            "redisUrl": _mask_url_credentials(self.redis_url),
            "arqQueueName": self.arq_queue_name,
            "streamTtlSeconds": self.stream_ttl_seconds,
            "accessTokenExpireMinutes": self.access_token_expire_minutes,
            "secretKey": _mask_secret(self.secret_key),
            "llmBaseUrl": self.llm_base_url,
            "llmApiKey": _mask_secret(self.llm_api_key),
            "llmModel": self.llm_model,
            "llmTimeoutSeconds": self.llm_timeout_seconds,
            "llmConfigured": bool(
                self.llm_base_url and self.llm_api_key and self.llm_model
            ),
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
