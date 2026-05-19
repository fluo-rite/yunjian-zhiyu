import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ProfileScreen } from "../features/profile/screens/profile-screen";
import { type ProfileStackParamList } from "./types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator(props: { onLogout: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome">
        {() => <ProfileScreen onLogout={props.onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
