import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  CHAT_LIST_STALE_TIME,
  CHAT_MESSAGES_STALE_TIME,
} from "@/lib/query/query-defaults";
import { getNextPageFromPagination } from "@/lib/query/infinite-query";
import {
  abortSessionMessageResponseSchema,
  createSessionMessageResponseSchema,
  messageListResponseSchema,
  sessionListResponseSchema,
  sessionSchema,
  type AbortSessionMessageResponse,
  type CreateSessionMessageResponse,
  type MessageListResponse,
  type Session,
  type SessionListResponse,
} from "@/features/sessions/api/session-schemas";
import {
  removeSessionFromLists,
  refreshSessionLists,
  removeSessionQueries,
  shouldRetrySessionEntityQuery,
} from "@/features/sessions/api/session-cache";
import { sessionQueryKeys } from "@/features/sessions/api/session-query-keys";

const DEFAULT_CHAT_PAGE = 1;
const DEFAULT_CHAT_PAGE_SIZE = 20;

export type SessionListFilters = {
  pageSize?: number;
};

export type ListSessionsParams = SessionListFilters & {
  page?: number;
};

export type CreateSessionInput = {
  title: string;
};

export type SendSessionMessageInput = {
  sessionId: string;
  content: string;
  options?: {
    useKnowledge?: boolean;
    useWebSearch?: boolean;
  };
};

export type AbortSessionMessageInput = {
  sessionId: string;
  assistantMessageId: string;
};

function normalizeSessionListFilters(filters?: SessionListFilters) {
  return {
    pageSize: filters?.pageSize ?? DEFAULT_CHAT_PAGE_SIZE,
  };
}

function normalizeListSessionsParams(params?: ListSessionsParams) {
  return {
    ...normalizeSessionListFilters(params),
    page: params?.page ?? DEFAULT_CHAT_PAGE,
  };
}

export async function listSessions(
  params?: ListSessionsParams,
): Promise<SessionListResponse> {
  const normalized = normalizeListSessionsParams(params);
  const response = await apiClient.get("/chats", {
    params: {
      page: normalized.page,
      page_size: normalized.pageSize,
    },
  });

  return sessionListResponseSchema.parse(response);
}

export async function createSession(payload: CreateSessionInput): Promise<Session> {
  const response = await apiClient.post("/chats", {
    body: payload,
  });

  return sessionSchema.parse(response);
}

export async function deleteSession(sessionId: string) {
  await apiClient.delete(`/chats/${sessionId}`);
}

export async function listSessionMessages(sessionId: string): Promise<MessageListResponse> {
  const response = await apiClient.get(`/chats/${sessionId}/messages`);
  return messageListResponseSchema.parse(response);
}

export async function sendSessionMessage(
  payload: SendSessionMessageInput,
): Promise<CreateSessionMessageResponse> {
  const response = await apiClient.post(`/chats/${payload.sessionId}/messages`, {
    body: {
      content: payload.content,
      options: payload.options,
    },
  });

  return createSessionMessageResponseSchema.parse(response);
}

export async function abortSessionMessage(
  payload: AbortSessionMessageInput,
): Promise<AbortSessionMessageResponse> {
  const response = await apiClient.post(
    `/chats/${payload.sessionId}/messages/${payload.assistantMessageId}/abort`,
  );

  return abortSessionMessageResponseSchema.parse(response);
}

export function useInfiniteSessionsQuery(filters?: SessionListFilters) {
  const normalizedFilters = normalizeSessionListFilters(filters);

  return useInfiniteQuery({
    queryKey: sessionQueryKeys.sessionList(normalizedFilters),
    queryFn: ({ pageParam }) =>
      listSessions({
        ...normalizedFilters,
        page: pageParam,
      }),
    initialPageParam: DEFAULT_CHAT_PAGE,
    getNextPageParam: getNextPageFromPagination,
    staleTime: CHAT_LIST_STALE_TIME,
  });
}

export function useSessionMessagesQuery(sessionId: string | null) {
  return useQuery({
    queryKey: sessionId
      ? sessionQueryKeys.sessionMessages(sessionId)
      : sessionQueryKeys.sessionMessages("pending"),
    queryFn: () => listSessionMessages(sessionId as string),
    enabled: Boolean(sessionId),
    staleTime: CHAT_MESSAGES_STALE_TIME,
    retry: shouldRetrySessionEntityQuery,
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSession,
    onSuccess: async () => {
      await refreshSessionLists(queryClient);
    },
  });
}

export function useDeleteSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSession,
    onSuccess: async (_, sessionId) => {
      removeSessionFromLists(queryClient, sessionId);
      await removeSessionQueries(queryClient, sessionId);
      await refreshSessionLists(queryClient);
    },
  });
}

export function useSendSessionMessageMutation() {
  return useMutation({
    mutationFn: sendSessionMessage,
  });
}

export function useAbortSessionMessageMutation() {
  return useMutation({
    mutationFn: abortSessionMessage,
  });
}
