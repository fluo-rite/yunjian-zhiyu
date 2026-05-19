import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const profileScreenStyles = StyleSheet.create({
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
  },
  avatarText: {
    color: colors.accentPressed,
    fontSize: typography.section,
    fontWeight: "700",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  caption: {
    color: colors.accentPressed,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  rowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "600",
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  rowAction: {
    color: colors.accentPressed,
    fontSize: typography.caption,
    fontWeight: "600",
  },
});
