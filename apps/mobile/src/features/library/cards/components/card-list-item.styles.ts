import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const cardListItemStyles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardEmbedded: {
    shadowOpacity: 0.03,
    elevation: 1,
  },
  cardSelectable: {
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  headerAside: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  meta: {
    color: colors.textTertiary,
    fontSize: typography.meta,
  },
  content: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 21,
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
  selectionDot: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectionDotSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  selectionText: {
    color: colors.textSecondary,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  selectionTextSelected: {
    color: colors.accentPressed,
  },
});
