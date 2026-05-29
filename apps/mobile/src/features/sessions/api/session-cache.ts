import { type InfiniteData, type QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-client";
import { type Message, type MessageListResponse } from "@/features/sessions/api/session-schemas";
import { sessionQueryKeys } from "@/features/sessions/api/session-query-keys";
import { type PaginatedItemsResponse } from "@/lib/query/infinite-query";
import { type Session } from "@/features/sessions/api/session-schemas";

async function invalidateExact(queryClient: QueryClient, queryKey: readonly unknown[]) {
  await queryClient.invalidateQueries({
    queryKey,
    exact: true,
  });
}

export function shouldRetrySessionEntityQuery(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
}

export async function refreshSessionLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: sessionQueryKeys.sessionLists(),
  });
}

export async function refreshSessionMessages(queryClient: QueryClient, sessionId: string) {
  await invalidateExact(queryClient, sessionQueryKeys.sessionMessages(sessionId));
}

export async function removeSessionQueries(queryClient: QueryClient, sessionId: string) {
  await queryClient.cancelQueries({
    queryKey: sessionQueryKeys.sessionMessages(sessionId),
    exact: true,
  });

  queryClient.removeQueries({
    queryKey: sessionQueryKeys.sessionMessages(sessionId),
    exact: true,
  });
}

export function removeSessionFromLists(queryClient: QueryClient, sessionId: string) {
  queryClient.setQueriesData<
    InfiniteData<PaginatedItemsResponse<Session>, unknown> | undefined
  >(
    {
      queryKey: sessionQueryKeys.sessionLists(),
    },
    (current) => {
      if (!current) {
        return current;
      }

      let removedCount = 0;
      const pages = current.pages.map((page) => {
        const items = page.items.filter((item) => item.id !== sessionId);
        removedCount += page.items.length - items.length;

        if (items.length === page.items.length) {
          return page;
        }

        return {
          ...page,
          items,
        };
      });

      if (removedCount === 0) {
        return current;
      }

      return {
        ...current,
        pages: pages.map((page) => ({
          ...page,
          pagination: {
            ...page.pagination,
            total: Math.max(0, page.pagination.total - removedCount),
          },
        })),
      };
    },
  );
}

export function patchTerminalAssistantMessage(
  queryClient: QueryClient,
  sessionId: string,
  message: Message,
) {
  queryClient.setQueryData<MessageListResponse | undefined>(
    sessionQueryKeys.sessionMessages(sessionId),
    (current) => {
      if (!current) {
        return current;
      }

      let didUpdate = false;
      const items = current.items.map((item) => {
        if (item.id !== message.id) {
          return item;
        }

        didUpdate = true;
        return message;
      });

      if (!didUpdate) {
        return current;
      }

      return {
        ...current,
        items,
      };
    },
  );
}
