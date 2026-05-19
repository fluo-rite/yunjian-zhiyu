import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { colors, radii, shadows, spacing, typography } from "../theme/tokens";
import { LibraryStackNavigator } from "./library-stack";
import { ProfileStackNavigator } from "./profile-stack";
import { SessionsStackNavigator } from "./sessions-stack";
import { type MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator(props: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      initialRouteName="SessionsStack"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accentPressed,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: typography.meta,
          fontWeight: "600",
        },
        tabBarItemStyle: {
          borderRadius: radii.lg,
          marginVertical: spacing.xs,
        },
        tabBarStyle: {
          height: 76,
          marginHorizontal: spacing.xl,
          marginBottom: spacing.sm,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          borderRadius: radii.xl,
          backgroundColor: colors.surface,
          position: "absolute",
          ...shadows.sheet,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tab.Screen
        component={SessionsStackNavigator}
        name="SessionsStack"
        options={{ title: "会话", tabBarLabel: "会话" }}
      />
      <Tab.Screen
        component={LibraryStackNavigator}
        name="LibraryStack"
        options={{ title: "知识库", tabBarLabel: "知识库" }}
      />
      <Tab.Screen name="ProfileStack" options={{ title: "我", tabBarLabel: "我" }}>
        {() => <ProfileStackNavigator onLogout={props.onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
