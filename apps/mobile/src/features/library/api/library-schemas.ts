import { z } from "zod";

export const cardStatusValues = ["pending", "active", "archived"] as const;
export const sourceTypeValues = ["manual_text", "document", "messages"] as const;
export const sourceStatusValues = ["processing", "ready", "failed"] as const;

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export const cardStatusSchema = z.enum(cardStatusValues);
export const sourceTypeSchema = z.enum(sourceTypeValues);
export const sourceStatusSchema = z.enum(sourceStatusValues);

export const cardSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  status: cardStatusSchema,
  sourceType: sourceTypeSchema,
  sourceId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const cardListResponseSchema = z.object({
  items: z.array(cardSchema),
  pagination: paginationSchema,
});

export const confirmCardsResponseSchema = z.object({
  items: z.array(cardSchema),
});

export const archiveCardResponseSchema = cardSchema;
export const restoreCardResponseSchema = cardSchema;

export const cardGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const cardGroupListResponseSchema = z.object({
  items: z.array(cardGroupSchema),
});

export const cardGroupCardsResponseSchema = z.object({
  items: z.array(cardSchema),
});

export const knowledgeSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceType: sourceTypeSchema,
  status: sourceStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const knowledgeSourceListResponseSchema = z.object({
  items: z.array(knowledgeSourceSchema),
  pagination: paginationSchema,
});

export const knowledgeSourceDetailSchema = knowledgeSourceSchema.extend({
  rawContent: z.string(),
  sourceMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const knowledgeSourceCardsResponseSchema = z.object({
  items: z.array(cardSchema),
});

export type CardStatus = z.infer<typeof cardStatusSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceStatus = z.infer<typeof sourceStatusSchema>;
export type KnowledgeCard = z.infer<typeof cardSchema>;
export type KnowledgeCardListResponse = z.infer<typeof cardListResponseSchema>;
export type ConfirmCardsResponse = z.infer<typeof confirmCardsResponseSchema>;
export type CardGroup = z.infer<typeof cardGroupSchema>;
export type CardGroupListResponse = z.infer<typeof cardGroupListResponseSchema>;
export type CardGroupCardsResponse = z.infer<typeof cardGroupCardsResponseSchema>;
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;
export type KnowledgeSourceListResponse = z.infer<typeof knowledgeSourceListResponseSchema>;
export type KnowledgeSourceDetail = z.infer<typeof knowledgeSourceDetailSchema>;
export type KnowledgeSourceCardsResponse = z.infer<typeof knowledgeSourceCardsResponseSchema>;
