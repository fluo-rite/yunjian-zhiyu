import { StyleSheet } from "react-native";

import { colors, radii, shadows } from "../../../theme/tokens";

export const libraryPanelStyles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
