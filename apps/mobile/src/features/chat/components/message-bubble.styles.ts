import { StyleSheet } from "react-native";

import { colors, radii } from "../../../theme/tokens";

export const messageBubbleStyles = StyleSheet.create({
  bubble: {
    gap: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
