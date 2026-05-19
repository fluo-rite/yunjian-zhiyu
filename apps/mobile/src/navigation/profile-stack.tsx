import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AccountScreen } from "../features/profile/screens/account-screen";
import { ProfileScreen } from "../features/profile/screens/profile-screen";
import { SettingsScreen } from "../features/profile/screens/settings-screen";
import { type ProfileStackParamList } from "./types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ProfileScreen} name="ProfileHome" />
      <Stack.Screen component={AccountScreen} name="Account" />
      <Stack.Screen component={SettingsScreen} name="Settings" />
    </Stack.Navigator>
  );
}
