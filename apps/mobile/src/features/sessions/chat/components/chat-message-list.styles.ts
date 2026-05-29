import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const chatMessageListStyles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  listHeader: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  itemSeparator: {
    height: spacing.lg,
  },
  infoCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "600",
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  welcomeCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  welcomeTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "600",
  },
  welcomeText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  footerSpacer: {
    width: "100%",
  },
});
