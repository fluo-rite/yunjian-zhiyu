from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Literal, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from app.agents.chat_agent.output import build_citations
from app.agents.chat_agent.prompt_builder import ChatPromptBuilder
from app.agents.chat_agent.state import ChatAgentState, WebContext
from app.agents.chat_agent.tools.retrieval_knowledge_cards import retrieval_knowledge_cards_tool
from app.agents.chat_agent.tools.web_search import web_search_tool
from app.schemas.card import CardRead
from app.schemas.message import CitationRead, MessageRead


class MessageStartRawEvent(TypedDict):
    type: Literal["message_start"]


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
    MessageStartRawEvent | MessageDeltaRawEvent | MessageCompleteRawEvent | ErrorRawEvent
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
        self._tools = [retrieval_knowledge_cards_tool, web_search_tool]
        self._decision_model = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=0,
            timeout=timeout_seconds,
            max_retries=2,
        ).bind_tools(self._tools)
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
        history_messages = self._to_history_messages(pre_messages)
        return {
            "user_id": user_id,
            "original_user_message": user_message.strip(),
            "use_knowledge": use_knowledge,
            "use_web_search": use_web_search,
            "pre_conversation_messages": history_messages,
            "messages": ChatPromptBuilder.build_tool_decision_messages(
                history_messages=history_messages,
                user_message=user_message,
                use_knowledge=use_knowledge,
                use_web_search=use_web_search,
            ),
            "executed_tools": [],
            "retrieved_cards": [],
            "searched_contexts": [],
            "used_web_search": False,
        }

    def _decide_tools_node(self, state: ChatAgentState) -> ChatAgentState:
        response = self._decision_model.invoke(state["messages"])
        return {"messages": [response]}

    def _collect_tool_results_node(self, state: ChatAgentState) -> ChatAgentState:
        retrieved_cards = list(state.get("retrieved_cards", []))
        searched_contexts = list(state.get("searched_contexts", []))
        executed_tools = list(state.get("executed_tools", []))

        for message in state.get("messages", []):
            if not isinstance(message, ToolMessage):
                continue
            payload = self._parse_tool_payload(message.content)
            payload_type = payload.get("type")
            if payload_type == "knowledge_retrieval":
                if "knowledge_retrieval" not in executed_tools:
                    executed_tools.append("knowledge_retrieval")
                for item in payload.get("items", []):
                    title = item.get("title")
                    content = item.get("content")
                    card_id = item.get("id")
                    if not all(isinstance(value, str) for value in (title, content, card_id)):
                        continue
                    candidate = CardRead.model_validate(item)
                    if candidate.id in {card.id for card in retrieved_cards}:
                        continue
                    retrieved_cards.append(candidate)
            elif payload_type == "web_search":
                if "web_search" not in executed_tools:
                    executed_tools.append("web_search")
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
            "executed_tools": executed_tools,
            "retrieved_cards": retrieved_cards,
            "searched_contexts": searched_contexts,
            "used_web_search": bool(searched_contexts),
        }

    def _assemble_context_node(self, state: ChatAgentState) -> ChatAgentState:
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
        workflow.add_node("decide_tools", self._decide_tools_node)
        workflow.add_node("tools", ToolNode(tools=self._tools))
        workflow.add_node("collect_tool_results", self._collect_tool_results_node)
        workflow.add_node("assemble_context", self._assemble_context_node)
        workflow.add_node("stream_reply", self._stream_reply_node)

        workflow.add_edge(START, "decide_tools")
        workflow.add_conditional_edges(
            "decide_tools",
            tools_condition,
            {
                "tools": "tools",
                END: "assemble_context",
            },
        )
        workflow.add_edge("tools", "collect_tool_results")
        workflow.add_edge("collect_tool_results", "assemble_context")
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
    def _parse_tool_payload(content: str | list[str | dict] | dict | object) -> dict:
        if isinstance(content, dict):
            return content
        return {}

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
