from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict

from langchain_core.messages import BaseMessage

from app.schemas.card import CardRead
from app.schemas.message import MessageRead


@dataclass(slots=True)
class WebContext:
    title: str
    url: str
    snippet: str
    content: str


class ChatAgentState(TypedDict, total=False):
    user_id: str
    original_user_message: str
    retrieval_query: str
    use_knowledge: bool
    use_web_search: bool
    pre_messages: list[MessageRead]
    pre_conversation_messages: list[BaseMessage]
    retrieved_cards: list[CardRead]
    searched_contexts: list[WebContext]
    reply_prompt: list[BaseMessage]
    final_answer: str
    used_web_search: bool
