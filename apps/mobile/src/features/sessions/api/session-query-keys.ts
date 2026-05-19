export const sessionQueryKeys = {
  all: ["sessions"] as const,
  chats: () => [...sessionQueryKeys.all, "chats"] as const,
  chatLists: () => [...sessionQueryKeys.chats(), "list"] as const,
  chatList: (page: number, pageSize: number) =>
    [...sessionQueryKeys.chatLists(), { page, pageSize }] as const,
  messages: (chatId: string) =>
    [...sessionQueryKeys.chats(), chatId, "messages"] as const,
};
