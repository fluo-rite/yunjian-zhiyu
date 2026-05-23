import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const groupCardPickerScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  headerContent: {
    gap: spacing.lg,
  },
  heroCard: {
    gap: spacing.sm,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "700",
  },
  heroText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  resultMeta: {
    color: colors.textTertiary,
    fontSize: typography.meta,
  },
  filterCard: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "700",
  },
});
