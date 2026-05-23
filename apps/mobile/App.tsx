import { StatusBar } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureApiClient } from "@/lib/api-client";
import { QueryProvider } from "@/lib/query/query-provider";
import { expireAuthSessionThunk } from "@/store/auth-slice";
import { store } from "@/store";
import { colors } from "@/theme/tokens";
import { RootNavigator } from "@/navigation/root-navigator";

configureApiClient({
  getAccessToken: () => store.getState().auth.tokens?.accessToken ?? null,
  onUnauthorized: async () => {
    const state = store.getState().auth;

    if (!state.isAuthenticated && !state.tokens) {
      return;
    }

    await store.dispatch(expireAuthSessionThunk("登录状态已失效，请重新登录。"));
  },
});

export default function App() {
  return (
    <Provider store={store}>
      <QueryProvider>
        <SafeAreaProvider>
          <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
          <RootNavigator />
        </SafeAreaProvider>
      </QueryProvider>
    </Provider>
  );
}
