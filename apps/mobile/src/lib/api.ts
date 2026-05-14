import { create, isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";

const sessionStorageKey = "yunjian.zhiyu.session";

export const API_BASE_URL = (() => {
  const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!configuredApiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required.");
  }
  return configuredApiBaseUrl;
})();
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;

export type User = {
  id: string;
  email: string;
  username?: string | null;
  nickname?: string | null;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type Chat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Citation = {
  type: "knowledge_card" | "web";
  title: string;
  snippet: string;
  sourceId?: string;
  url?: string;
};

export type MessageMetadata = {
  usedKnowledge?: boolean;
  usedWebSearch?: boolean;
  model?: string;
  latencyMs?: number;
  citations?: Citation[];
  requestedUseKnowledge?: boolean;
  requestedUseWebSearch?: boolean;
  streaming?: boolean;
  error?: string;
};

export type Message = {
  id: string;
  chatId: string;
  role: string;
  status: "streaming" | "done" | "failed" | "aborted";
  content: string;
  errorMessage?: string | null;
  metadata?: MessageMetadata | null;
  streamUrl?: string | null;
  createdAt: string;
};

export type AuthResponse = {
  user: User;
  tokens: Tokens;
};

export type Card = {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  cardType: string;
  tags: string[];
  status: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type CardListResponse = {
  items: Card[];
  pagination: Pagination;
};

export type ChatListResponse = {
  items: Chat[];
  pagination: Pagination;
};

export type RegisterRequest = {
  email: string;
  username?: string;
  nickname?: string;
  password: string;
};

export type LoginRequest = {
  account: string;
  password: string;
};

export type CreateCardRequest = {
  title: string;
  summary?: string;
  content: string;
  cardType: string;
  tags: string[];
  status: string;
  sourceType: string;
};

export type CreateChatRequest = {
  title: string;
};

export type CreateChatMessageRequest = {
  content: string;
  options: {
    useKnowledge: boolean;
    useWebSearch: boolean;
  };
};

export type CreateChatMessageResponse = {
  userMessageId: string;
  assistantMessageId: string;
  streamUrl: string;
};

export type ChatMessageListResponse = {
  items: Message[];
};

export type AbortChatMessageResponse = {
  assistantMessageId: string;
  status: "aborting";
};

type SessionPayload = Tokens | null;

export const apiClient = create({
  baseURL: API_V1_BASE_URL,
  timeout: 15_000,
});

export function setAccessToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
}

export async function saveSession(tokens: Tokens) {
  await SecureStore.setItemAsync(sessionStorageKey, JSON.stringify(tokens));
}

export async function hydrateSession(): Promise<SessionPayload> {
  const raw = await SecureStore.getItemAsync(sessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    await SecureStore.deleteItemAsync(sessionStorageKey);
    return null;
  }
}

export async function clearPersistedSession() {
  await SecureStore.deleteItemAsync(sessionStorageKey);
}

export function extractApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.length > 0) {
      return detail;
    }
    return error.message || "请求失败，请稍后重试。";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "发生未知错误，请稍后重试。";
}

export async function register(payload: RegisterRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/register", payload);
  return response.data;
}

export async function login(payload: LoginRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
}

export async function fetchCards(params: { status?: string } = {}) {
  const response = await apiClient.get<CardListResponse>("/cards", { params });
  return response.data;
}

export async function fetchChats() {
  const response = await apiClient.get<ChatListResponse>("/chats");
  return response.data;
}

export async function createChat(payload: CreateChatRequest) {
  const response = await apiClient.post<Chat>("/chats", payload);
  return response.data;
}

export async function fetchChatMessages(chatId: string) {
  const response = await apiClient.get<ChatMessageListResponse>(`/chats/${chatId}/messages`);
  return response.data;
}

export async function createChatMessage(chatId: string, payload: CreateChatMessageRequest) {
  const response = await apiClient.post<CreateChatMessageResponse>(`/chats/${chatId}/messages`, payload);
  return response.data;
}

export async function abortChatMessage(chatId: string, assistantMessageId: string) {
  const response = await apiClient.post<AbortChatMessageResponse>(
    `/chats/${chatId}/messages/${assistantMessageId}/abort`,
  );
  return response.data;
}

export async function createCard(payload: CreateCardRequest) {
  const response = await apiClient.post<Card>("/cards", payload);
  return response.data;
}

export async function deleteCard(cardId: string) {
  await apiClient.delete(`/cards/${cardId}`);
}
