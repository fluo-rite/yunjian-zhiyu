import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren } from "react";

import { queryClient } from "./query-client";
import { useAppStateSync } from "./use-app-state-sync";
import { useOnlineManager } from "./use-online-manager";

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
