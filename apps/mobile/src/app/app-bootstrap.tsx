import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { configureApiClient } from "@/lib/api-client";
import { RootNavigator } from "@/navigation/root-navigator";
import {
  expireAuthSessionThunk,
  hydrateAuthSession,
  selectIsAuthenticated,
  selectIsHydrating,
} from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { store } from "@/store";
import { colors, spacing, typography } from "@/theme/tokens";

configureApiClient({
  getAccessToken: () => store.getState().auth.tokens?.accessToken ?? null,
  onUnauthorized: async () => {
    const state = store.getState().auth;

    if (!state.isAuthenticated && !state.tokens) {
      return;
    }

    await store.dispatch(expireAuthSessionThunk("登录已失效，请重新登录。"));
  },
});

export function AppBootstrap() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isHydrating = useAppSelector(selectIsHydrating);

  useEffect(() => {
    dispatch(hydrateAuthSession());
  }, [dispatch]);

  if (isHydrating) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.accentPressed} size="large" />
        <Text style={styles.loadingTitle}>正在恢复登录状态</Text>
        <Text style={styles.loadingText}>请稍等，我们正在同步本地会话并准备应用环境。</Text>
      </View>
    );
  }

  return <RootNavigator isAuthenticated={isAuthenticated} />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  loadingTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
  },
});
