import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const accountScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  heroCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
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
  sectionCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  infoRow: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  infoLabel: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "600",
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
