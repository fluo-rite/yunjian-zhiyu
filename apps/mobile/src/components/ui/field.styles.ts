import { StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";

export const fieldStyles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  inputMultiline: {
    minHeight: 112,
    textAlignVertical: "top",
  },
});
