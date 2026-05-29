import { z } from "zod";

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sessionListResponseSchema = z.object({
  items: z.array(sessionSchema),
  pagination: paginationSchema,
});

export const citationSchema = z.object({
  type: z.enum(["knowledge_card", "web"]),
  title: z.string(),
  snippet: z.string(),
  sourceId: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export const messageMetadataSchema = z
  .object({
    requestedUseKnowledge: z.boolean().optional(),
    requestedUseWebSearch: z.boolean().optional(),
    usedKnowledge: z.boolean().optional(),
    usedWebSearch: z.boolean().optional(),
    latencyMs: z.number().int().nullable().optional(),
    citations: z.array(citationSchema).optional(),
  })
  .passthrough();

const rawMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(["user", "assistant"]),
  status: z.enum(["streaming", "done", "failed", "aborted"]),
  content: z.string(),
  errorMessage: z.string().nullable().optional(),
  metadata: messageMetadataSchema.nullable().optional(),
  createdAt: z.string(),
});

export const messageSchema = rawMessageSchema.transform(({ chatId, ...message }) => ({
  ...message,
  sessionId: chatId,
}));

export const messageListResponseSchema = z.object({
  items: z.array(messageSchema),
});

export const createSessionMessageResponseSchema = z.object({
  userMessageId: z.string(),
  assistantMessageId: z.string(),
});

export const abortSessionMessageResponseSchema = z.object({
  assistantMessageId: z.string(),
  status: z.literal("aborting"),
});

export type Session = z.infer<typeof sessionSchema>;
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessageListResponse = z.infer<typeof messageListResponseSchema>;
export type CreateSessionMessageResponse = z.infer<typeof createSessionMessageResponseSchema>;
export type AbortSessionMessageResponse = z.infer<typeof abortSessionMessageResponseSchema>;
