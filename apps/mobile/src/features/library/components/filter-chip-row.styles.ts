import { StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

export const filterChipRowStyles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  chipLabelActive: {
    color: colors.accentPressed,
  },
});
