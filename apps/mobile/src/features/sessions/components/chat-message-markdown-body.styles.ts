import { Platform, StyleSheet } from "react-native";
import type { MarkdownStyle } from "react-native-enriched-markdown";

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

export const chatMessageMarkdownStyles: MarkdownStyle = {
  paragraph: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 24,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  h1: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  h2: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  h3: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  h4: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  h5: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  h6: {
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
    borderColor: colors.border,
    borderWidth: 3,
    gapWidth: spacing.md,
    backgroundColor: colors.surfaceMuted,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  list: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 24,
    markerColor: colors.accentPressed,
    markerFontWeight: "700",
    gapWidth: spacing.sm,
    marginLeft: spacing.xs,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  codeBlock: {
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
    underline: false,
  },
  strong: {
    color: colors.textPrimary,
  },
  em: {
    color: colors.textPrimary,
  },
  code: {
    color: colors.textPrimary,
    fontSize: 14,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    fontFamily: monoFontFamily,
  },
  thematicBreak: {
    color: colors.border,
    height: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  table: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    headerFontFamily: monoFontFamily,
    headerBackgroundColor: colors.surfaceMuted,
    headerTextColor: colors.textPrimary,
    rowEvenBackgroundColor: colors.surface,
    rowOddBackgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    cellPaddingHorizontal: spacing.sm,
    cellPaddingVertical: spacing.sm,
  },
};
