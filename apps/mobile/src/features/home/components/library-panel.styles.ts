import { StyleSheet } from "react-native";

import { colors, radii } from "@/theme/tokens";

export const libraryPanelStyles = StyleSheet.create({
  centerState: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  centerStateTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  centerStateText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 16,
  },
  libraryHeader: {
    gap: 16,
    marginBottom: 12,
  },
  libraryHero: {
    backgroundColor: colors.panelBackground,
    borderRadius: radii.hero,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  heroEyebrow: {
    color: colors.textAccent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.warmSurface,
    borderRadius: radii.lg,
    padding: 16,
    gap: 6,
  },
  summaryLabel: {
    color: "#7a5b35",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyState: {
    backgroundColor: colors.panelBackground,
    borderRadius: radii.xxl,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});
