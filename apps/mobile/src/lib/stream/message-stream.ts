import { resolveApiBaseUrl } from "@/config/app-config";
import {
  type ErrorEvent,
  type MessageAbortedEvent,
  type MessageDeltaEvent,
  type MessageDoneEvent,
  type MessageStartEvent,
  type StatusEvent,
} from "@/lib/stream/stream-schemas";
import {
  decodeErrorEvent,
  decodeMessageAbortedEvent,
  decodeMessageDeltaEventLight,
  decodeMessageDoneEvent,
  decodeMessageStartEvent,
  decodeStatusEvent,
  isStreamContractError,
} from "@/lib/stream/stream-decoders";
import { connectSse, type SseConnection } from "@/lib/stream/sse-client";

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
      try {
        switch (event.event) {
          case "status":
            options.onEvent({
              type: "status",
              id: event.id,
              data: decodeStatusEvent(event.data),
            });
            return;
          case "message.start":
            options.onEvent({
              type: "message.start",
              id: event.id,
              data: decodeMessageStartEvent(event.data),
            });
            return;
          case "message.delta": {
            const decoded = decodeMessageDeltaEventLight(event.data);

            if (!decoded) {
              if (__DEV__) {
                // Delta events are high-frequency; ignore malformed payloads outside development.
                console.warn(`Ignored invalid SSE delta payload for event "${event.event}".`);
              }
              return;
            }

            options.onEvent({
              type: "message.delta",
              id: event.id,
              data: decoded,
            });
            return;
          }
          case "message.done":
            options.onEvent({
              type: "message.done",
              id: event.id,
              data: decodeMessageDoneEvent(event.data),
            });
            return;
          case "message.aborted":
            options.onEvent({
              type: "message.aborted",
              id: event.id,
              data: decodeMessageAbortedEvent(event.data),
            });
            return;
          case "error":
            options.onEvent({
              type: "error",
              id: event.id,
              data: decodeErrorEvent(event.data),
            });
            return;
          default:
            return;
        }
      } catch (error) {
        if (isStreamContractError(error)) {
          options.onError?.(new Error(`Invalid SSE payload for event "${event.event}".`));
          return;
        }

        throw error;
      }
    },
  });
}
