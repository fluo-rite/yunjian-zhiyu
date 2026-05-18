import { StyleSheet } from "react-native";

import { colors, radii } from "../../../theme/tokens";

export const chatWorkspaceStyles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
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
