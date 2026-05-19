import { StyleSheet } from "react-native";

import { spacing, typography, colors } from "../../theme/tokens";

export const screenHeaderStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sideButton: {
    minWidth: 56,
  },
  sidePlaceholder: {
    minWidth: 56,
  },
  center: {
    flex: 1,
    gap: spacing.xs,
    alignItems: "center",
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "600",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
    textAlign: "center",
  },
});
