import { createParser, type EventSourceMessage } from "eventsource-parser";
import * as SecureStore from "expo-secure-store";

import { API_BASE_URL, type Citation, type Message } from "@/lib/api";

const streamCursorStoragePrefix = "yunjian.zhiyu.stream.cursor";

type StreamEnvelope = {
  id: string | null;
};

export type MessageStartStreamEvent = StreamEnvelope & {
  event: "message.start";
  data: {
    messageId: string;
    chatId: string;
    role: "assistant";
  };
};

export type MessageDeltaStreamEvent = StreamEnvelope & {
  event: "message.delta";
  data: {
    messageId: string;
    delta: string;
  };
};

export type MessageDoneStreamEvent = StreamEnvelope & {
  event: "message.done";
  data: {
    message: Message;
    citations: Citation[];
  };
};

export type MessageAbortedStreamEvent = StreamEnvelope & {
  event: "message.aborted";
  data: {
    message: Message;
  };
};

export type ErrorStreamEvent = StreamEnvelope & {
  event: "error";
  data: {
    message: string;
    chatId: string;
    messageId?: string;
    finalMessage?: Message;
  };
};

export type AgentStreamEvent =
  | MessageStartStreamEvent
  | MessageDeltaStreamEvent
  | MessageDoneStreamEvent
  | MessageAbortedStreamEvent
  | ErrorStreamEvent;

type ChatStreamParams = {
  chatId: string;
  assistantMessageId: string;
  accessToken: string;
  lastEventId?: string;
  signal?: AbortSignal;
  onEvent: (event: AgentStreamEvent) => void;
};

export function buildChatMessageStreamUrl(chatId: string, assistantMessageId: string) {
  return `/api/v1/chats/${chatId}/messages/${assistantMessageId}/stream`;
}

function buildStreamCursorKey(messageId: string) {
  return `${streamCursorStoragePrefix}:${messageId}`;
}

export async function saveLastStreamEventId(messageId: string, lastEventId: string) {
  await SecureStore.setItemAsync(buildStreamCursorKey(messageId), lastEventId);
}

export async function loadLastStreamEventId(messageId: string) {
  return SecureStore.getItemAsync(buildStreamCursorKey(messageId));
}

export async function clearLastStreamEventId(messageId: string) {
  await SecureStore.deleteItemAsync(buildStreamCursorKey(messageId));
}

function parseBusinessEvent(message: EventSourceMessage): AgentStreamEvent {
  const payload = JSON.parse(message.data) as AgentStreamEvent["data"];
  const id = message.id || null;

  switch (message.event) {
    case "message.start":
      return {
        id,
        event: "message.start",
        data: payload as MessageStartStreamEvent["data"],
      };
    case "message.delta":
      return {
        id,
        event: "message.delta",
        data: payload as MessageDeltaStreamEvent["data"],
      };
    case "message.done":
      return {
        id,
        event: "message.done",
        data: payload as MessageDoneStreamEvent["data"],
      };
    case "message.aborted":
      return {
        id,
        event: "message.aborted",
        data: payload as MessageAbortedStreamEvent["data"],
      };
    case "error":
      return {
        id,
        event: "error",
        data: payload as ErrorStreamEvent["data"],
      };
    default:
      throw new Error(`Unsupported stream event: ${message.event}`);
  }
}

async function extractErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) {
      return payload.detail;
    }
  }

  const fallbackText = await response.text();
  return fallbackText || `Stream request failed with status ${response.status}.`;
}

export async function chatStream(params: ChatStreamParams) {
  const streamUrl = new URL(
    buildChatMessageStreamUrl(params.chatId, params.assistantMessageId),
    API_BASE_URL,
  );
  streamUrl.searchParams.set("lastEventId", params.lastEventId || "0-0");

  const response = await fetch(streamUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${params.accessToken}`,
    },
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (!response.body) {
    throw new Error("Streaming response body is not available.");
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  const parser = createParser({
    onEvent(event) {
      if (!event.event || !event.data) {
        return;
      }
      params.onEvent(parseBusinessEvent(event));
    },
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      parser.feed(decoder.decode());
      break;
    }

    parser.feed(decoder.decode(value, { stream: true }));
  }
}
