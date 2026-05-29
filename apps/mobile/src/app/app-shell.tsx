import { StatusBar } from "react-native";

import { AppBootstrap } from "@/app/app-bootstrap";
import { AppProviders } from "@/app/app-providers";
import { colors } from "@/theme/tokens";

export function AppShell() {
  return (
    <AppProviders>
      <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
      <AppBootstrap />
    </AppProviders>
  );
}
