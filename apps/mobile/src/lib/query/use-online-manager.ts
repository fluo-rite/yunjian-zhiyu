import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";

function resolveOnlineState(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
) {
  if (isConnected === false) {
    return false;
  }

  if (isInternetReachable === false) {
    return false;
  }

  return true;
}

export function useOnlineManager() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(
        resolveOnlineState(state.isConnected, state.isInternetReachable),
      );
    });

    return unsubscribe;
  }, []);
}
