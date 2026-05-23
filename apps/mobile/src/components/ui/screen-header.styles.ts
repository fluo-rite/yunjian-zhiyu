import { StyleSheet } from "react-native";

import { colors, shadows, spacing, typography } from "@/theme/tokens";

export const screenHeaderStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  sidePlaceholder: {
    width: 32,
    height: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "600",
    textAlign: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
    textAlign: "center",
  },
  rightAction: {
    minWidth: 32,
    height: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rightActionPressed: {
    opacity: 0.6,
  },
  rightActionText: {
    color: colors.accentPressed,
    fontSize: typography.body,
    fontWeight: "600",
  },
});
