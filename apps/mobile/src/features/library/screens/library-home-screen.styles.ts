import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const libraryHomeScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.lg,
  },
  eyebrow: {
    alignSelf: "flex-start",
    borderRadius: radii.xl,
    backgroundColor: colors.accentSoft,
    color: colors.accentPressed,
    fontSize: typography.meta,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.display,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
  },
  searchCard: {
    gap: spacing.lg,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  searchCopy: {
    gap: spacing.sm,
  },
  searchLabel: {
    color: colors.accentPressed,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  searchTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  searchDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  sectionDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  entryList: {
    gap: spacing.lg,
  },
  entryCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  entryCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
  entryEyebrow: {
    color: colors.accentPressed,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  entryTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  entryText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  entryLink: {
    color: colors.accentPressed,
    fontSize: typography.body,
    fontWeight: "700",
  },
  roadmapCard: {
    gap: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.accentSurface,
    padding: spacing.xl,
  },
  roadmapTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  roadmapText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
