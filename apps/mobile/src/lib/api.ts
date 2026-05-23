import { apiClient } from "@/lib/api-client";

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  nickname: string | null;
  authProvider: "local" | "oauth";
  createdAt: string;
  updatedAt: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: TokenPair;
};

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

export function login(payload: LoginPayload) {
  return apiClient.post<AuthResponse>("/auth/login", {
    requiresAuth: false,
    body: payload,
  });
}

export function register(payload: RegisterPayload) {
  return apiClient.post<AuthResponse>("/auth/register", {
    requiresAuth: false,
    body: payload,
  });
}

export function fetchCurrentUser(token?: string) {
  return apiClient.get<AuthUser>("/auth/me", {
    tokenOverride: token,
  });
}
