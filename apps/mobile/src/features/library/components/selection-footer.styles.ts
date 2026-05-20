import { StyleSheet } from "react-native";

import { colors, shadows, spacing, typography } from "../../../theme/tokens";

export const selectionFooterStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  content: {
    gap: spacing.md,
    borderTopLeftRadius: spacing.xl,
    borderTopRightRadius: spacing.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.sheet,
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.md,
  },
});
