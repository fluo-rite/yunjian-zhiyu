from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Literal, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph

from app.agents.chat_agent.output import build_citations
from app.agents.chat_agent.policy import WebSearchDecision
from app.agents.chat_agent.prompt_builder import (
    ChatPromptBuilder,
    build_retrieval_query_rewrite_prompt,
    build_web_search_decision_prompt,
)
from app.agents.chat_agent.state import ChatAgentState, WebContext
from app.schemas.message import CitationRead, MessageRead
from app.services.retrieval_service import get_retrieval_service
from app.services.web_search_service import get_web_search_service


class MessageStartRawEvent(TypedDict):
    type: Literal["message_start"]


class StatusRawEvent(TypedDict):
    type: Literal["status"]
    phase: Literal["retrieving_knowledge", "searching_web", "assembling_answer"]
    label: str


class MessageDeltaRawEvent(TypedDict):
    type: Literal["message_delta"]
    delta: str


class MessageCompleteRawEvent(TypedDict):
    type: Literal["message_complete"]
    content: str
    citations: list[CitationRead]
    used_knowledge: bool
    used_web_search: bool


class ErrorRawEvent(TypedDict):
    type: Literal["error"]
    message: str


ChatAgentRawEvent = (
    StatusRawEvent | MessageStartRawEvent | MessageDeltaRawEvent | MessageCompleteRawEvent | ErrorRawEvent
)


class ChatAgentConfigurationError(RuntimeError):
    pass


class ChatAgent:
    def __init__(
        self,
        *,
        model_name: str,
        api_key: str,
        base_url: str,
        timeout_seconds: float,
    ) -> None:
        self._retrieval_query_rewrite_model = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=0,
            timeout=timeout_seconds,
            max_retries=2,
        )
        self._web_search_decision_model = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=0,
            timeout=timeout_seconds,
            max_retries=2,
        ).with_structured_output(WebSearchDecision)
        self._reply_model = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=0.2,
            timeout=timeout_seconds,
            max_retries=2,
        )
        self._graph = self._build_graph()

    async def reply(
        self,
        *,
        user_id: str,
        user_message: str,
        pre_messages: list[MessageRead],
        use_knowledge: bool,
        use_web_search: bool,
    ) -> AsyncIterator[ChatAgentRawEvent]:
        try:
            async for event in self._graph.astream(
                self._build_initial_state(
                    user_id=user_id,
                    user_message=user_message,
                    pre_messages=pre_messages,
                    use_knowledge=use_knowledge,
                    use_web_search=use_web_search,
                ),
                stream_mode="custom",
            ):
                yield event
        except Exception as error:
            yield {
                "type": "error",
                "message": str(error),
            }

    def _build_initial_state(
        self,
        *,
        user_id: str,
        user_message: str,
        pre_messages: list[MessageRead],
        use_knowledge: bool,
        use_web_search: bool,
    ) -> ChatAgentState:
        return {
            "user_id": user_id,
            "original_user_message": user_message.strip(),
            "retrieval_query": user_message.strip(),
            "use_knowledge": use_knowledge,
            "use_web_search": use_web_search,
            "pre_conversation_messages": self._to_history_messages(pre_messages),
            "pre_messages": pre_messages,
            "retrieved_cards": [],
            "searched_contexts": [],
            "used_web_search": False,
        }

    def _rewrite_retrieval_query_node(self, state: ChatAgentState) -> ChatAgentState:
        if not state.get("use_knowledge"):
            return {"retrieval_query": state["original_user_message"]}

        try:
            response = self._retrieval_query_rewrite_model.invoke(
                build_retrieval_query_rewrite_prompt(
                    query=state["original_user_message"],
                    pre_messages=state.get("pre_messages", []),
                )
            )
            rewritten = self._normalize_retrieval_query(
                self._extract_text(response.content),
                fallback=state["original_user_message"],
            )
        except Exception:
            rewritten = state["original_user_message"]

        return {"retrieval_query": rewritten or state["original_user_message"]}

    def _retrieve_knowledge_node(self, state: ChatAgentState) -> ChatAgentState:
        if not state.get("use_knowledge"):
            return {"retrieved_cards": []}

        writer = get_stream_writer()
        writer(
            {
                "type": "status",
                "phase": "retrieving_knowledge",
                "label": "正在检索知识库",
            }
        )
        cards = get_retrieval_service().retrieve_knowledge_cards(
            user_id=state["user_id"],
            query=state.get("retrieval_query", state["original_user_message"]),
            limit=5,
        )
        return {"retrieved_cards": cards}

    async def _search_web_node(self, state: ChatAgentState) -> ChatAgentState:
        if not state.get("use_web_search", False):
            return {"searched_contexts": [], "used_web_search": False}

        if not self._should_search_web(state):
            return {"searched_contexts": [], "used_web_search": False}

        writer = get_stream_writer()
        writer(
            {
                "type": "status",
                "phase": "searching_web",
                "label": "正在联网搜索",
            }
        )
        payload = await get_web_search_service().search(state["original_user_message"])
        searched_contexts: list[WebContext] = []
        for item in payload.get("items", []):
            title = item.get("title")
            url = item.get("url")
            snippet = item.get("snippet")
            content = item.get("content")
            if not all(isinstance(value, str) for value in (title, url, snippet, content)):
                continue
            searched_contexts.append(
                WebContext(
                    title=title,
                    url=url,
                    snippet=snippet,
                    content=content,
                )
            )

        return {
            "searched_contexts": searched_contexts,
            "used_web_search": bool(searched_contexts),
        }

    def _should_search_web(self, state: ChatAgentState) -> bool:
        decision = self._web_search_decision_model.invoke(
            build_web_search_decision_prompt(
                query=state["original_user_message"],
                retrieved_cards=state.get("retrieved_cards", []),
            )
        )
        return decision.should_search_web

    def _assemble_context_node(self, state: ChatAgentState) -> ChatAgentState:
        writer = get_stream_writer()
        writer(
            {
                "type": "status",
                "phase": "assembling_answer",
                "label": "正在整理答案",
            }
        )
        reply_prompt = ChatPromptBuilder.build_reply_prompt(
            history_messages=state.get("pre_conversation_messages", []),
            user_message=state["original_user_message"],
            use_knowledge=state["use_knowledge"],
            use_web_search=state["use_web_search"],
            retrieved_cards=state.get("retrieved_cards", []),
            searched_contexts=state.get("searched_contexts", []),
        )
        return {"reply_prompt": reply_prompt}

    async def _stream_reply_node(self, state: ChatAgentState) -> ChatAgentState:
        writer = get_stream_writer()
        writer({"type": "message_start"})

        response_parts: list[str] = []
        async for chunk in self._reply_model.astream(state["reply_prompt"]):
            delta = self._extract_text(chunk.content)
            if not delta:
                continue
            response_parts.append(delta)
            writer({"type": "message_delta", "delta": delta})

        final_answer = "".join(response_parts).strip()
        if not final_answer:
            raise RuntimeError("LLM returned an empty streaming response.")

        citations = build_citations(
            retrieved_cards=state.get("retrieved_cards", []),
            searched_contexts=state.get("searched_contexts", []),
        )
        writer(
            {
                "type": "message_complete",
                "content": final_answer,
                "citations": citations,
                "used_knowledge": bool(state.get("retrieved_cards")),
                "used_web_search": state.get("used_web_search", False),
            }
        )
        return {"final_answer": final_answer}

    def _build_graph(self):
        workflow = StateGraph(ChatAgentState)
        workflow.add_node("rewrite_retrieval_query", self._rewrite_retrieval_query_node)
        workflow.add_node("retrieve_knowledge", self._retrieve_knowledge_node)
        workflow.add_node("search_web", self._search_web_node)
        workflow.add_node("assemble_context", self._assemble_context_node)
        workflow.add_node("stream_reply", self._stream_reply_node)

        workflow.add_edge(START, "rewrite_retrieval_query")
        workflow.add_edge("rewrite_retrieval_query", "retrieve_knowledge")
        workflow.add_edge("retrieve_knowledge", "search_web")
        workflow.add_edge("search_web", "assemble_context")
        workflow.add_edge("assemble_context", "stream_reply")
        workflow.add_edge("stream_reply", END)
        return workflow.compile()

    @staticmethod
    def _to_history_messages(pre_messages: list[MessageRead]) -> list[BaseMessage]:
        history_messages: list[BaseMessage] = []
        for message in pre_messages:
            content = message.content.strip()
            if not content:
                continue
            if message.role == "user":
                history_messages.append(HumanMessage(content=content))
            elif message.role == "assistant":
                history_messages.append(AIMessage(content=content))
        return history_messages

    @staticmethod
    def _extract_text(content: str | list[str | dict] | object) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and isinstance(item.get("text"), str):
                    parts.append(item["text"])
            return "".join(parts)
        text_attr = getattr(content, "text", None)
        if isinstance(text_attr, str):
            return text_attr
        return ""

    @staticmethod
    def _normalize_retrieval_query(value: str, *, fallback: str) -> str:
        candidate = value.strip()
        if not candidate:
            return fallback

        if candidate.startswith("```"):
            candidate = candidate.strip("`").strip()
        if candidate.lower().startswith("json"):
            candidate = candidate[4:].strip()
        if candidate.startswith("{") and candidate.endswith("}"):
            return fallback

        prefixes = (
            "retrieval_query:",
            "retrieval query:",
            "rewritten query:",
            "query:",
            "改写后的查询:",
            "改写后的查询：",
            "检索查询:",
            "检索查询：",
            "检索词:",
            "检索词：",
            "查询:",
            "查询：",
        )
        lowered = candidate.lower()
        for prefix in prefixes:
            if lowered.startswith(prefix.lower()):
                candidate = candidate[len(prefix) :].strip()
                break

        if not candidate or len(candidate) > 300:
            return fallback
        return candidate
