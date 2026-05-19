import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { enableScreens } from "react-native-screens";

import {
  hydrateAuthSession,
  selectIsAuthenticated,
  selectIsHydrating,
} from "../store/auth-slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { colors, spacing, typography } from "../theme/tokens";
import { AuthStackNavigator } from "./auth-stack";
import { MainTabNavigator } from "./main-tabs";
import { type RootStackParamList } from "./types";

enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    border: colors.borderSoft,
    card: colors.surface,
    primary: colors.accent,
    text: colors.textPrimary,
  },
};

export function RootNavigator() {
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
        <Text style={styles.loadingText}>稍等一下，我们在检查本地会话是否仍然有效。</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen component={MainTabNavigator} name="Main" />
        ) : (
          <Stack.Screen component={AuthStackNavigator} name="Auth" />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
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
