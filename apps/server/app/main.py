import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401
from app.api.router import api_router
from app.core.config import get_settings

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    logger.info(
        "Loaded backend settings: %s",
        json.dumps(settings.startup_log_payload(), ensure_ascii=False),
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
    application.include_router(api_router)
    return application


app = create_app()
