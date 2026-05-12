"""Route modules."""

from app.api.routes.auth import router as auth_router
from app.api.routes.cards import router as cards_router
from app.api.routes.chats import router as chats_router
from app.api.routes.health import router as health_router

__all__ = ["auth_router", "cards_router", "chats_router", "health_router"]
