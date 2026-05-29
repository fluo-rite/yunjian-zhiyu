import { QueryClient } from "@tanstack/react-query";

import { DEFAULT_QUERY_GC_TIME, DEFAULT_QUERY_STALE_TIME } from "@/lib/query/query-defaults";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_QUERY_STALE_TIME,
      gcTime: DEFAULT_QUERY_GC_TIME,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
