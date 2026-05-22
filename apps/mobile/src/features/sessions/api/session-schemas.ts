import { z } from "zod";

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const chatSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const chatListResponseSchema = z.object({
  items: z.array(chatSchema),
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

export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(["user", "assistant"]),
  status: z.enum(["streaming", "done", "failed", "aborted"]),
  content: z.string(),
  errorMessage: z.string().nullable().optional(),
  metadata: messageMetadataSchema.nullable().optional(),
  createdAt: z.string(),
});

export const messageListResponseSchema = z.object({
  items: z.array(messageSchema),
});

export const createChatMessageResponseSchema = z.object({
  userMessageId: z.string(),
  assistantMessageId: z.string(),
});

export const abortChatMessageResponseSchema = z.object({
  assistantMessageId: z.string(),
  status: z.literal("aborting"),
});

export type Chat = z.infer<typeof chatSchema>;
export type ChatListResponse = z.infer<typeof chatListResponseSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessageListResponse = z.infer<typeof messageListResponseSchema>;
export type CreateChatMessageResponse = z.infer<typeof createChatMessageResponseSchema>;
export type AbortChatMessageResponse = z.infer<typeof abortChatMessageResponseSchema>;
