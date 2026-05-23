import { StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "../../../theme/tokens";

export const chatMessageItemStyles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
  },
  rowSelectable: {
    borderRadius: radii.xl,
  },
  rowSelectablePressed: {
    opacity: 0.9,
  },
  rowLeft: {
    justifyContent: "flex-start",
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  bubbleWrap: {
    maxWidth: "100%",
    gap: spacing.xs,
  },
  bubble: {
    gap: spacing.sm,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bubbleSelected: {
    borderWidth: 1,
    borderColor: colors.accentPressed,
    backgroundColor: colors.accentSoft,
  },
  assistantBubble: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  userBubble: {
    backgroundColor: colors.accent,
  },
  userText: {
    color: colors.textOnAccent,
    fontSize: typography.body,
    lineHeight: 24,
  },
  userTextSelected: {
    color: colors.textPrimary,
  },
  statusText: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  streamingStatusText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  citationTrigger: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  citationTriggerPressed: {
    opacity: 0.78,
  },
  citationTriggerText: {
    color: colors.textSecondary,
    fontSize: typography.meta,
    fontWeight: "600",
  },
  selectionIndicator: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.accentSoft,
  },
  selectionIndicatorText: {
    color: colors.accentPressed,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    paddingHorizontal: spacing.xl,
  },
  modalBackdropDismiss: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    maxHeight: "72%",
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.section,
    fontWeight: "700",
  },
  modalCloseButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalCloseButtonPressed: {
    opacity: 0.72,
  },
  modalCloseText: {
    color: colors.accentPressed,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  citationCard: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  citationMeta: {
    color: colors.textTertiary,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  citationTitle: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18,
  },
  citationSnippet: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
});
