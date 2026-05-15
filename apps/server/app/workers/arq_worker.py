from __future__ import annotations

from arq.connections import RedisSettings

from app.core.config import get_settings
from app.services.chat_generation_service import run_chat_generation_job

settings = get_settings()


class WorkerSettings:
    functions = [run_chat_generation_job]
    queue_name = settings.arq_queue_name
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
