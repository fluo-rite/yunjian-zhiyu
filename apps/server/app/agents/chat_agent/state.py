from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Literal, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from app.schemas.card import CardRead

@dataclass
class WebContext:
    title: str
    url: str
    snippet: str
    content: str


class ChatAgentState(TypedDict, total=False):
    user_id: str
    original_user_message: str
    use_knowledge: bool
    use_web_search: bool
    pre_conversation_messages: list[BaseMessage]
    messages: Annotated[list[BaseMessage], add_messages]
    executed_tools: list[Literal["knowledge_retrieval", "web_search"]]
    retrieved_cards: list[CardRead]
    searched_contexts: list[WebContext]
    reply_prompt: list[BaseMessage]
    final_answer: str
    used_web_search: bool
