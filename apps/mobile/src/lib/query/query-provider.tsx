import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren } from "react";

import { queryClient } from "@/lib/query/query-client";
import { useAppStateSync } from "@/lib/query/use-app-state-sync";
import { useOnlineManager } from "@/lib/query/use-online-manager";

function QueryLifecycleBridge() {
  useAppStateSync();
  useOnlineManager();
  return null;
}

export function QueryProvider(props: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryLifecycleBridge />
      {props.children}
    </QueryClientProvider>
  );
}
