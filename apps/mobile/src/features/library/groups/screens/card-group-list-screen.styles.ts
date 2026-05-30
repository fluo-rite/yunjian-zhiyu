import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const cardGroupListScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
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
  resultMeta: {
    color: colors.textTertiary,
    fontSize: typography.meta,
  },
  formCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
});
