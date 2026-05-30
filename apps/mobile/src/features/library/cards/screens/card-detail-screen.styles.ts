import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const cardDetailScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stateWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.md,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "700",
  },
  heroMeta: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagLabel: {
    color: colors.textSecondary,
    fontSize: typography.meta,
    fontWeight: "600",
  },
  sectionCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  actionRow: {
    gap: spacing.sm,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoRow: {
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 21,
  },
});
