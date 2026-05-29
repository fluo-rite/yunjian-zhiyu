import { apiClient } from "@/lib/api-client";
import {
  authResponseSchema,
  authUserSchema,
  type AuthResponse,
  type AuthUser,
} from "@/features/auth/api/auth-schemas";

export type LoginPayload = {
  account: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  username?: string;
  password: string;
  nickname?: string;
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/login", {
    requiresAuth: false,
    body: payload,
  });

  return authResponseSchema.parse(response);
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/register", {
    requiresAuth: false,
    body: payload,
  });

  return authResponseSchema.parse(response);
}

export async function fetchCurrentUser(token?: string): Promise<AuthUser> {
  const response = await apiClient.get("/auth/me", {
    tokenOverride: token,
  });

  return authUserSchema.parse(response);
}
