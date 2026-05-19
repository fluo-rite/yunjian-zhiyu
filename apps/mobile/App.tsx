import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "./src/theme/tokens";
import { RootNavigator } from "./src/navigation/root-navigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
