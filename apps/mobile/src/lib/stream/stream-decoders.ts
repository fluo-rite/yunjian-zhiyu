import { ZodError } from "zod";

import {
  errorEventSchema,
  messageAbortedEventSchema,
  messageDoneEventSchema,
  messageStartEventSchema,
  statusEventSchema,
  type ErrorEvent,
  type MessageAbortedEvent,
  type MessageDeltaEvent,
  type MessageDoneEvent,
  type MessageStartEvent,
  type StatusEvent,
} from "@/lib/stream/stream-schemas";

function parseJsonPayload(raw: string) {
  return JSON.parse(raw) as unknown;
}

export function decodeStatusEvent(raw: string): StatusEvent {
  return statusEventSchema.parse(parseJsonPayload(raw));
}

export function decodeMessageStartEvent(raw: string): MessageStartEvent {
  return messageStartEventSchema.parse(parseJsonPayload(raw));
}

export function decodeMessageDeltaEventLight(raw: string): MessageDeltaEvent | null {
  const payload = parseJsonPayload(raw);

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { delta, messageId } = payload as {
    delta?: unknown;
    messageId?: unknown;
  };

  if (typeof delta !== "string" || typeof messageId !== "string") {
    return null;
  }

  return {
    delta,
    messageId,
  };
}

export function decodeMessageDoneEvent(raw: string): MessageDoneEvent {
  return messageDoneEventSchema.parse(parseJsonPayload(raw));
}

export function decodeMessageAbortedEvent(raw: string): MessageAbortedEvent {
  return messageAbortedEventSchema.parse(parseJsonPayload(raw));
}

export function decodeErrorEvent(raw: string): ErrorEvent {
  return errorEventSchema.parse(parseJsonPayload(raw));
}

export function isStreamContractError(error: unknown) {
  return error instanceof SyntaxError || error instanceof ZodError;
}
