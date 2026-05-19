import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const chatScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerButton: {
    minWidth: 52,
  },
  headerCenter: {
    flex: 1,
    gap: spacing.xs,
    alignItems: "center",
  },
  headerEyebrow: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "600",
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
    textAlign: "center",
  },
  messages: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  infoCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "600",
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  statusCard: {
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statusLabel: {
    color: colors.accentPressed,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  welcomeCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
  },
  welcomeTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "600",
  },
  welcomeText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleLeft: {
    justifyContent: "flex-start",
  },
  bubbleRight: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "84%",
    gap: spacing.sm,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  userBubble: {
    backgroundColor: colors.accentSoft,
  },
  bubbleRole: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "600",
  },
  bubbleText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  citationText: {
    color: colors.accentPressed,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  metaText: {
    color: colors.textTertiary,
    fontSize: typography.caption,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  composerWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  composer: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.sheet,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});
