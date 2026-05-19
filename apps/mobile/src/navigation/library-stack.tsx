import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LibraryScreen } from "../features/library/screens/library-screen";
import { type LibraryStackParamList } from "./types";

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export function LibraryStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={LibraryScreen} name="LibraryHome" />
    </Stack.Navigator>
  );
}
