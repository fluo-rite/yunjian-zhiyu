import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const sessionImportHintModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.24)",
    paddingHorizontal: spacing.xl,
  },
  backdropDismiss: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  card: {
    gap: spacing.lg,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    ...shadows.card,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  actionList: {
    gap: spacing.md,
  },
});
