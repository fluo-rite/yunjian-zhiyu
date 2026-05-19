import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const loginScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  hero: {
    gap: spacing.xxl,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.xl,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.accentPressed,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  heading: {
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.display,
    fontWeight: "700",
    lineHeight: 36,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
  },
  card: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  fieldGroup: {
    gap: spacing.lg,
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  footer: {
    gap: spacing.sm,
  },
  footerTitle: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  footerText: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
