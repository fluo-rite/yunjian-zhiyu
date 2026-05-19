import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "../features/auth/screens/login-screen";
import { RegisterScreen } from "../features/auth/screens/register-screen";
import { type AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator(props: { onLogin: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onGoToRegister={() => navigation.navigate("Register")}
            onLogin={props.onLogin}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onBackToLogin={() => navigation.goBack()}
            onRegister={props.onLogin}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
