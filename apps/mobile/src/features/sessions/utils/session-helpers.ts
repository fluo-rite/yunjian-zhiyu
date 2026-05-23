import type { Message } from "../api";
import { sessionCopy } from "./session-copy";

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

export function getSelectedMessagePayload(messages: Message[], selectedIds: ReadonlySet<string>) {
  return messages
    .filter((message) => selectedIds.has(message.id))
    .map((message) => message.content.trim())
    .filter(Boolean);
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
