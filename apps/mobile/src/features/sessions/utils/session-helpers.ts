import type { Message } from "@/features/sessions/api";
import { sessionCopy } from "@/features/sessions/utils/session-copy";

export function buildChatTitle(content: string) {
  const normalized = content.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 20) || sessionCopy.chat.newChatTitle;
}

export function buildMessageSourceName(chatTitle: string) {
  return `${chatTitle.trim() || sessionCopy.chat.unnamedChatTitle} 对话摘录`;
}

export function findLatestStreamingAssistantMessage(messages: Message[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status === "streaming");
}

function findMessageIndex(messages: Message[], messageId: string | null) {
  if (!messageId) {
    return -1;
  }

  return messages.findIndex((message) => message.id === messageId);
}

export function getSelectedRangeMessageIds(
  messages: Message[],
  rangeStartMessageId: string | null,
  rangeEndMessageId: string | null,
) {
  const startIndex = findMessageIndex(messages, rangeStartMessageId);

  if (startIndex < 0) {
    return [];
  }

  if (!rangeEndMessageId) {
    return [messages[startIndex].id];
  }

  const endIndex = findMessageIndex(messages, rangeEndMessageId);

  if (endIndex < 0) {
    return [];
  }

  const lowerIndex = Math.min(startIndex, endIndex);
  const upperIndex = Math.max(startIndex, endIndex);

  return messages.slice(lowerIndex, upperIndex + 1).map((message) => message.id);
}

export function getSelectedRangeMeta(
  messages: Message[],
  rangeStartMessageId: string | null,
  rangeEndMessageId: string | null,
) {
  const selectedMessageIds = getSelectedRangeMessageIds(
    messages,
    rangeStartMessageId,
    rangeEndMessageId,
  );

  if (!rangeStartMessageId) {
    return {
      status: "idle" as const,
      selectedCount: 0,
      selectedMessageIds: [],
    };
  }

  if (!rangeEndMessageId) {
    return {
      status: "pending_end" as const,
      selectedCount: selectedMessageIds.length,
      selectedMessageIds,
    };
  }

  return {
    status: "complete" as const,
    selectedCount: selectedMessageIds.length,
    selectedMessageIds,
  };
}

export function formatSessionUpdatedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hours}:${minutes}`;
}
