import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "../features/auth/screens/login-screen";
import { RegisterScreen } from "../features/auth/screens/register-screen";
import { type AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {({ navigation }) => <LoginScreen onGoToRegister={() => navigation.navigate("Register")} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {({ navigation }) => <RegisterScreen onBackToLogin={() => navigation.goBack()} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
