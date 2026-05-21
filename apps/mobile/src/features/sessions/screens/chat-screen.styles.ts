import { StyleSheet } from "react-native";

import { colors, spacing } from "../../../theme/tokens";

export const chatScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  composerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    backgroundColor: "transparent",
  },
});
