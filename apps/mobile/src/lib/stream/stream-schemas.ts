import { z } from "zod";

import { messageSchema } from "@/features/sessions/api/session-schemas";

export const statusEventSchema = z.object({
  phase: z.enum(["retrieving_knowledge", "searching_web", "assembling_answer"]),
  label: z.string(),
});

export const messageStartEventSchema = z
  .object({
  messageId: z.string(),
    chatId: z.string(),
  role: z.literal("assistant"),
  })
  .transform(({ chatId, ...event }) => ({
    ...event,
    sessionId: chatId,
  }));

export const messageDeltaEventSchema = z.object({
  messageId: z.string(),
  delta: z.string(),
});

export const messageDoneEventSchema = z.object({
  message: messageSchema,
});

export const messageAbortedEventSchema = z.object({
  message: messageSchema,
});

export const errorEventSchema = z
  .object({
    message: z.string(),
    chatId: z.string(),
    messageId: z.string().nullable().optional(),
    finalMessage: messageSchema.nullable().optional(),
  })
  .transform(({ chatId, ...event }) => ({
    ...event,
    sessionId: chatId,
  }));

export type StatusEvent = z.infer<typeof statusEventSchema>;
export type MessageStartEvent = z.infer<typeof messageStartEventSchema>;
export type MessageDeltaEvent = z.infer<typeof messageDeltaEventSchema>;
export type MessageDoneEvent = z.infer<typeof messageDoneEventSchema>;
export type MessageAbortedEvent = z.infer<typeof messageAbortedEventSchema>;
export type ErrorEvent = z.infer<typeof errorEventSchema>;
