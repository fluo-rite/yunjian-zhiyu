import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const chatComposerStyles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    ...shadows.sheet,
  },
  input: {
    flex: 1,
    minHeight: 24,
    maxHeight: 120,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 24,
  },
  action: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  actionPrimary: {
    backgroundColor: colors.accent,
  },
  actionSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
});
