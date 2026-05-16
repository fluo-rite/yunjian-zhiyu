from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.card_groups import router as card_groups_router
from app.api.routes.cards import router as cards_router
from app.api.routes.chats import router as chats_router
from app.api.routes.health import router as health_router
from app.api.routes.knowledge_sources import router as knowledge_sources_router
from app.core.config import get_settings

settings = get_settings()

api_router = APIRouter()
api_router.include_router(health_router)

v1_router = APIRouter(prefix=settings.api_v1_prefix)
v1_router.include_router(auth_router)
v1_router.include_router(cards_router)
v1_router.include_router(card_groups_router)
v1_router.include_router(chats_router)
v1_router.include_router(knowledge_sources_router)
api_router.include_router(v1_router)
