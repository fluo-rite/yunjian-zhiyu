export const sessionQueryKeys = {
  all: ["sessions"] as const,
  sessionLists: () => [...sessionQueryKeys.all, "list"] as const,
  sessionList: (filters: { pageSize: number }) =>
    [...sessionQueryKeys.sessionLists(), filters] as const,
  sessionMessages: (sessionId: string) =>
    [...sessionQueryKeys.all, sessionId, "messages"] as const,
};
