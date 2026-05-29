import { type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { QueryProvider } from "@/lib/query/query-provider";
import { store } from "@/store";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <QueryProvider>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </QueryProvider>
    </Provider>
  );
}
