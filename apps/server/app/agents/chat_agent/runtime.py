from __future__ import annotations

from functools import lru_cache

from app.agents.chat_agent.agent import ChatAgent, ChatAgentConfigurationError
from app.core.config import get_settings


class ChatAgentRuntime:
    def __init__(self) -> None:
        self._agent: ChatAgent | None = None

    def get_chat_agent(self) -> ChatAgent:
        if self._agent is None:
            self._agent = self._build_chat_agent()
        return self._agent

    @staticmethod
    def _build_chat_agent() -> ChatAgent:
        settings = get_settings()
        if not settings.llm_base_url or not settings.llm_api_key or not settings.llm_model:
            raise ChatAgentConfigurationError("LLM is not configured.")
        return ChatAgent(
            model_name=settings.llm_model,
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout_seconds=settings.llm_timeout_seconds,
        )


@lru_cache
def get_chat_agent_runtime() -> ChatAgentRuntime:
    return ChatAgentRuntime()


def get_chat_agent() -> ChatAgent:
    return get_chat_agent_runtime().get_chat_agent()
