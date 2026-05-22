import { Platform, StyleSheet } from "react-native";

import { colors, radii, spacing, typography } from "../../../theme/tokens";

const monoFontFamily = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

export const chatMessageMarkdownBodyStyles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
  },
});

export const chatMessageMarkdownStyles = {
  body: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 24,
  },
  text: {
    color: colors.textPrimary,
  },
  paragraph: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 24,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  heading1: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  heading2: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  heading3: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  heading4: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  heading5: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  heading6: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  blockquote: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
    borderLeftColor: colors.border,
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    backgroundColor: colors.surfaceMuted,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  bullet_list: {
    marginTop: 0,
    marginBottom: spacing.md,
  },
  ordered_list: {
    marginTop: 0,
    marginBottom: spacing.md,
  },
  list_item: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 24,
    marginLeft: spacing.xs,
  },
  bullet_list_icon: {
    color: colors.accentPressed,
    marginRight: spacing.sm,
  },
  bullet_list_content: {
    flex: 1,
  },
  ordered_list_icon: {
    color: colors.accentPressed,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  ordered_list_content: {
    flex: 1,
  },
  code_block: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  fence: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: 0,
    marginBottom: spacing.md,
    fontFamily: monoFontFamily,
  },
  link: {
    color: colors.accentPressed,
    textDecorationLine: "none",
  },
  strong: {
    color: colors.textPrimary,
  },
  em: {
    color: colors.textPrimary,
  },
  code_inline: {
    color: colors.textPrimary,
    fontSize: 14,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    fontFamily: monoFontFamily,
  },
  hr: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  table: {
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  thead: {
    backgroundColor: colors.surfaceMuted,
  },
  tbody: {
    backgroundColor: colors.surface,
  },
  th: {
    color: colors.textPrimary,
    fontFamily: monoFontFamily,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderColor: colors.borderSoft,
    borderWidth: StyleSheet.hairlineWidth,
  },
  td: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderColor: colors.borderSoft,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tr: {
    borderColor: colors.borderSoft,
    borderWidth: StyleSheet.hairlineWidth,
  },
};
