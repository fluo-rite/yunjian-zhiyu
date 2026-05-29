import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const sessionListItemStyles = StyleSheet.create({
  card: {
    position: "relative",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    paddingTop: spacing.xl,
    paddingRight: spacing.xl,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.xl,
    ...shadows.card,
  },
  cardMenuOpen: {
    zIndex: 20,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "600",
    flex: 1,
  },
  cardTime: {
    color: colors.textTertiary,
    fontSize: typography.meta,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  moreButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  moreButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  deleteMenu: {
    position: "absolute",
    right: spacing.lg,
    bottom: 52,
    minWidth: 88,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    zIndex: 25,
    ...shadows.card,
  },
  deleteMenuPressed: {
    backgroundColor: "#FFF1F2",
  },
  deleteMenuDisabled: {
    opacity: 0.7,
  },
  deleteMenuText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700",
  },
});
