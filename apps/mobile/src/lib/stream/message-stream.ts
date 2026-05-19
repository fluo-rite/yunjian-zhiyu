import { resolveApiBaseUrl } from "../../config/app-config";
import {
  errorEventSchema,
  messageAbortedEventSchema,
  messageDeltaEventSchema,
  messageDoneEventSchema,
  messageStartEventSchema,
  statusEventSchema,
  type ErrorEvent,
  type MessageAbortedEvent,
  type MessageDeltaEvent,
  type MessageDoneEvent,
  type MessageStartEvent,
  type StatusEvent,
} from "./stream-schemas";
import { connectSse, type SseConnection } from "./sse-client";

export type AssistantMessageStreamEvent =
  | { type: "status"; id?: string; data: StatusEvent }
  | { type: "message.start"; id?: string; data: MessageStartEvent }
  | { type: "message.delta"; id?: string; data: MessageDeltaEvent }
  | { type: "message.done"; id?: string; data: MessageDoneEvent }
  | { type: "message.aborted"; id?: string; data: MessageAbortedEvent }
  | { type: "error"; id?: string; data: ErrorEvent };

export type AssistantMessageStreamOptions = {
  chatId: string;
  assistantMessageId: string;
  accessToken?: string | null;
  lastEventId?: string | null;
  onEvent: (event: AssistantMessageStreamEvent) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
};

function buildStreamUrl(chatId: string, assistantMessageId: string) {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, "");
  return `${baseUrl}/chats/${chatId}/messages/${assistantMessageId}/stream`;
}

export function connectAssistantMessageStream(
  options: AssistantMessageStreamOptions,
): SseConnection {
  return connectSse({
    url: buildStreamUrl(options.chatId, options.assistantMessageId),
    accessToken: options.accessToken,
    lastEventId: options.lastEventId,
    onError: options.onError,
    onClose: options.onClose,
    onEvent(event) {
      switch (event.event) {
        case "status":
          options.onEvent({
            type: "status",
            id: event.id,
            data: statusEventSchema.parse(JSON.parse(event.data)),
          });
          return;
        case "message.start":
          options.onEvent({
            type: "message.start",
            id: event.id,
            data: messageStartEventSchema.parse(JSON.parse(event.data)),
          });
          return;
        case "message.delta":
          options.onEvent({
            type: "message.delta",
            id: event.id,
            data: messageDeltaEventSchema.parse(JSON.parse(event.data)),
          });
          return;
        case "message.done":
          options.onEvent({
            type: "message.done",
            id: event.id,
            data: messageDoneEventSchema.parse(JSON.parse(event.data)),
          });
          return;
        case "message.aborted":
          options.onEvent({
            type: "message.aborted",
            id: event.id,
            data: messageAbortedEventSchema.parse(JSON.parse(event.data)),
          });
          return;
        case "error":
          options.onEvent({
            type: "error",
            id: event.id,
            data: errorEventSchema.parse(JSON.parse(event.data)),
          });
          return;
        default:
          return;
      }
    },
  });
}
