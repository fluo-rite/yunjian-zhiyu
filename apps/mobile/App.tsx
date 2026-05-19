import { StatusBar } from "react-native";
import { Provider } from "react-redux";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { store } from "./src/store";
import { colors } from "./src/theme/tokens";
import { RootNavigator } from "./src/navigation/root-navigator";

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
