import { StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "../../../theme/tokens";

export const errorStateStyles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.18)",
    borderRadius: radii.xl,
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    padding: spacing.xl,
  },
  title: {
    color: colors.danger,
    fontSize: typography.section,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
