import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const sourceDetailScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerContent: {
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.sm,
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  sectionCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  sectionCaption: {
    color: colors.textTertiary,
    fontSize: typography.meta,
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
