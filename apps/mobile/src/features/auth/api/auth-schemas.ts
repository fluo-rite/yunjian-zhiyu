import { z } from "zod";

export const authProviderSchema = z.enum(["local", "oauth"]);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  nickname: z.string().nullable(),
  authProvider: authProviderSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const authResponseSchema = z.object({
  user: authUserSchema,
  tokens: tokenPairSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
