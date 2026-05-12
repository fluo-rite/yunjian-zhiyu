import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Provider } from "react-redux";

import { hydrateSession, setAccessToken } from "@/lib/api";
import { setHydrated, setSession } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";
import { store } from "@/store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function SessionBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const storedSession = await hydrateSession();
      if (!isMounted) {
        return;
      }

      if (storedSession?.accessToken) {
        setAccessToken(storedSession.accessToken);
        dispatch(setSession(storedSession));
      } else {
        setAccessToken(null);
      }

      dispatch(setHydrated(true));
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return null;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SessionBootstrap />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </Provider>
  );
}
