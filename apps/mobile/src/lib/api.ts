import { Platform } from "react-native";

const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000/api/v1"
    : "http://127.0.0.1:8000/api/v1";

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

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const fallbackMessage = `请求失败 (${response.status})`;

    try {
      const errorPayload = (await response.json()) as {
        detail?: string | { message?: string };
      };

      const detail = errorPayload.detail;
      const message =
        typeof detail === "string"
          ? detail
          : typeof detail?.message === "string"
            ? detail.message
            : fallbackMessage;

      throw new ApiError(message, response.status);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(fallbackMessage, response.status);
    }
  }

  return (await response.json()) as T;
}

export function login(payload: LoginPayload) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function register(payload: RegisterPayload) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function fetchCurrentUser(token: string) {
  return request<AuthUser>("/auth/me", {
    token,
  });
}
