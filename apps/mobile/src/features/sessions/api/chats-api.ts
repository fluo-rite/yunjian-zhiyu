import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  abortChatMessageResponseSchema,
  chatListResponseSchema,
  chatSchema,
  createChatMessageResponseSchema,
  messageListResponseSchema,
  type AbortChatMessageResponse,
  type Chat,
  type ChatListResponse,
  type CreateChatMessageResponse,
  type MessageListResponse,
} from "@/features/sessions/api/session-schemas";
import { sessionQueryKeys } from "@/features/sessions/api/session-query-keys";

const DEFAULT_CHAT_PAGE = 1;
const DEFAULT_CHAT_PAGE_SIZE = 20;

export type ListChatsParams = {
  page?: number;
  pageSize?: number;
};

export type CreateChatInput = {
  title: string;
};

export type SendChatMessageInput = {
  chatId: string;
  content: string;
  options?: {
    useKnowledge?: boolean;
    useWebSearch?: boolean;
  };
};

export type AbortChatMessageInput = {
  chatId: string;
  assistantMessageId: string;
};

function normalizeListChatsParams(params?: ListChatsParams) {
  return {
    page: params?.page ?? DEFAULT_CHAT_PAGE,
    pageSize: params?.pageSize ?? DEFAULT_CHAT_PAGE_SIZE,
  };
}

export async function listChats(params?: ListChatsParams): Promise<ChatListResponse> {
  const normalized = normalizeListChatsParams(params);
  const response = await apiClient.get("/chats", {
    params: {
      page: normalized.page,
      page_size: normalized.pageSize,
    },
  });

  return chatListResponseSchema.parse(response);
}

export async function createChat(payload: CreateChatInput): Promise<Chat> {
  const response = await apiClient.post("/chats", {
    body: payload,
  });

  return chatSchema.parse(response);
}

export async function deleteChat(chatId: string) {
  await apiClient.delete(`/chats/${chatId}`);
}

export async function listChatMessages(chatId: string): Promise<MessageListResponse> {
  const response = await apiClient.get(`/chats/${chatId}/messages`);
  return messageListResponseSchema.parse(response);
}

export async function sendChatMessage(
  payload: SendChatMessageInput,
): Promise<CreateChatMessageResponse> {
  const response = await apiClient.post(`/chats/${payload.chatId}/messages`, {
    body: {
      content: payload.content,
      options: payload.options,
    },
  });

  return createChatMessageResponseSchema.parse(response);
}

export async function abortChatMessage(
  payload: AbortChatMessageInput,
): Promise<AbortChatMessageResponse> {
  const response = await apiClient.post(
    `/chats/${payload.chatId}/messages/${payload.assistantMessageId}/abort`,
  );

  return abortChatMessageResponseSchema.parse(response);
}

export function useChatsQuery(params?: ListChatsParams) {
  const normalized = normalizeListChatsParams(params);

  return useQuery({
    queryKey: sessionQueryKeys.chatList(normalized.page, normalized.pageSize),
    queryFn: () => listChats(normalized),
  });
}

export function useChatMessagesQuery(chatId: string | null) {
  return useQuery({
    queryKey: chatId ? sessionQueryKeys.messages(chatId) : sessionQueryKeys.messages("pending"),
    queryFn: () => listChatMessages(chatId as string),
    enabled: Boolean(chatId),
  });
}

export function useCreateChatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChat,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.chatLists(),
      });
    },
  });
}

export function useDeleteChatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChat,
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.chatLists(),
      });
      queryClient.removeQueries({
        queryKey: sessionQueryKeys.messages(chatId),
      });
    },
  });
}

export function useSendChatMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.messages(payload.chatId),
      });
      queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.chatLists(),
      });
    },
  });
}

export function useAbortChatMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: abortChatMessage,
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.messages(payload.chatId),
      });
    },
  });
}
