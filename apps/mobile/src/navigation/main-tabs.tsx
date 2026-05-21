import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { LibraryHomeScreen } from "../features/library/screens/library-home-screen";
import { ProfileScreen } from "../features/profile/screens/profile-screen";
import { SessionListScreen } from "../features/sessions/screens/session-list-screen";
import { colors, radii, shadows, spacing, typography } from "../theme/tokens";
import { type MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="SessionsHome"
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
        component={SessionListScreen}
        name="SessionsHome"
        options={{
          title: "会话",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={22}
            />
          ),
        }}
      />
      <Tab.Screen
        component={LibraryHomeScreen}
        name="LibraryHome"
        options={{
          title: "知识库",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "albums" : "albums-outline"}
              size={22}
            />
          ),
        }}
      />
      <Tab.Screen
        component={ProfileScreen}
        name="ProfileHome"
        options={{
          title: "我的",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              color={color}
              name={focused ? "person-circle" : "person-circle-outline"}
              size={22}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
