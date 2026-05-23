import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const createSourceDocumentScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
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
  formCard: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  fileCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
  },
  fileName: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  fileMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  actionRow: {
    gap: spacing.md,
  },
});
