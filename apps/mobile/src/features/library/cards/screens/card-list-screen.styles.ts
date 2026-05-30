import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const cardListScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContent: {
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.xs,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  contextText: {
    color: colors.accentPressed,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  resultMeta: {
    color: colors.textTertiary,
    fontSize: typography.meta,
  },
  filterCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
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
