import { StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

export const sourceStatusBadgeStyles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  processingBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  readyBadge: {
    backgroundColor: colors.accentSoft,
  },
  failedBadge: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
  },
  label: {
    fontSize: typography.meta,
    fontWeight: "700",
  },
  processingLabel: {
    color: colors.accentPressed,
  },
  readyLabel: {
    color: colors.accentPressed,
  },
  failedLabel: {
    color: colors.danger,
  },
});
