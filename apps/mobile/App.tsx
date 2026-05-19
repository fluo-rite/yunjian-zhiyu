import { StatusBar } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureApiClient } from "./src/lib/api-client";
import { QueryProvider } from "./src/lib/query/query-provider";
import { expireAuthSessionThunk } from "./src/store/auth-slice";
import { store } from "./src/store";
import { colors } from "./src/theme/tokens";
import { RootNavigator } from "./src/navigation/root-navigator";

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
