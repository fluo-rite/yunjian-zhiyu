import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SessionListScreen } from "../features/sessions/screens/session-list-screen";
import { type SessionsStackParamList } from "./types";

const Stack = createNativeStackNavigator<SessionsStackParamList>();

export function SessionsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={SessionListScreen} name="SessionList" />
    </Stack.Navigator>
  );
}
