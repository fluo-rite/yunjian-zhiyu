import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const chatSelectionActionBarStyles = StyleSheet.create({
  container: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  actionRow: {
    gap: spacing.sm,
  },
});
