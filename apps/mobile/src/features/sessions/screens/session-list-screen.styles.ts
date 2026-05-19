import { StyleSheet } from "react-native";

import { colors, radii, shadows, spacing, typography } from "../../../theme/tokens";

export const sessionListScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  headerCopy: {
    gap: spacing.lg,
  },
  eyebrow: {
    color: colors.accentPressed,
    fontSize: typography.meta,
    fontWeight: "700",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
  },
  section: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.card,
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
});
