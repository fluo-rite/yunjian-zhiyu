import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { enableScreens } from "react-native-screens";

import { AccountScreen } from "../features/profile/screens/account-screen";
import { SettingsScreen } from "../features/profile/screens/settings-screen";
import { CardDetailScreen } from "../features/library/screens/card-detail-screen";
import { CardGroupDetailScreen } from "../features/library/screens/card-group-detail-screen";
import { CardGroupListScreen } from "../features/library/screens/card-group-list-screen";
import { CardListScreen } from "../features/library/screens/card-list-screen";
import { CreateSourceTextScreen } from "../features/library/screens/create-source-text-screen";
import { CreateSourceDocumentScreen } from "../features/library/screens/create-source-document-screen";
import { GroupCardPickerScreen } from "../features/library/screens/group-card-picker-screen";
import { SourceDetailScreen } from "../features/library/screens/source-detail-screen";
import { SourceListScreen } from "../features/library/screens/source-list-screen";
import { ChatScreen } from "../features/sessions/screens/chat-screen";
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
        <Text style={styles.loadingText}>稍等一下，我们正在检查本地会话是否仍然有效。</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen component={MainTabNavigator} name="MainTabs" />
            <Stack.Screen component={ChatScreen} name="Chat" />
            <Stack.Screen component={CardListScreen} name="CardList" />
            <Stack.Screen component={CardDetailScreen} name="CardDetail" />
            <Stack.Screen component={CardGroupListScreen} name="CardGroupList" />
            <Stack.Screen component={CardGroupDetailScreen} name="CardGroupDetail" />
            <Stack.Screen component={GroupCardPickerScreen} name="GroupCardPicker" />
            <Stack.Screen component={SourceListScreen} name="SourceList" />
            <Stack.Screen component={SourceDetailScreen} name="SourceDetail" />
            <Stack.Screen component={CreateSourceTextScreen} name="CreateSourceText" />
            <Stack.Screen component={CreateSourceDocumentScreen} name="CreateSourceDocument" />
            <Stack.Screen component={AccountScreen} name="Account" />
            <Stack.Screen component={SettingsScreen} name="Settings" />
          </>
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
