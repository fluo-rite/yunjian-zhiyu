import { StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "../../../theme/tokens";

export const cardStatusBadgeStyles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pendingBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  activeBadge: {
    backgroundColor: colors.accentSoft,
  },
  archivedBadge: {
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    fontSize: typography.meta,
    fontWeight: "700",
  },
  pendingLabel: {
    color: colors.accentPressed,
  },
  activeLabel: {
    color: colors.accentPressed,
  },
  archivedLabel: {
    color: colors.textSecondary,
  },
});
