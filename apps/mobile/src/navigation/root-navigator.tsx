import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";

import { CardDetailScreen } from "@/features/library/cards/screens/card-detail-screen";
import { CardListScreen } from "@/features/library/cards/screens/card-list-screen";
import { CardGroupDetailScreen } from "@/features/library/groups/screens/card-group-detail-screen";
import { CardGroupListScreen } from "@/features/library/groups/screens/card-group-list-screen";
import { GroupCardPickerScreen } from "@/features/library/groups/screens/group-card-picker-screen";
import { CreateSourceDocumentScreen } from "@/features/library/sources/screens/create-source-document-screen";
import { CreateSourceTextScreen } from "@/features/library/sources/screens/create-source-text-screen";
import { SourceDetailScreen } from "@/features/library/sources/screens/source-detail-screen";
import { SourceListScreen } from "@/features/library/sources/screens/source-list-screen";
import { AccountScreen } from "@/features/profile/screens/account-screen";
import { SettingsScreen } from "@/features/profile/screens/settings-screen";
import { ChatScreen } from "@/features/sessions/chat/screens/chat-screen";
import { AuthStackNavigator } from "@/navigation/auth-stack";
import { MainTabNavigator } from "@/navigation/main-tabs";
import { type RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/tokens";

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

export function RootNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
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
