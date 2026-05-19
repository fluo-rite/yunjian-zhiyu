import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

function handleAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

export function useAppStateSync() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);
}
