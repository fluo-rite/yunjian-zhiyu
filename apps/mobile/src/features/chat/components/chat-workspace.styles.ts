import { StyleSheet } from "react-native";

import { colors, radii } from "@/theme/tokens";

export const chatWorkspaceStyles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 16,
  },
  heroCard: {
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
  chatToolbar: {
    flexDirection: "row",
    gap: 12,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "#d4c1a3",
    backgroundColor: colors.panelBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionChipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandMuted,
  },
  optionChipLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  optionChipLabelActive: {
    color: colors.brand,
  },
  chatChipRow: {
    gap: 10,
    paddingRight: 8,
  },
  chatChip: {
    borderRadius: radii.pill,
    backgroundColor: colors.panelBackground,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chatChipLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  chatChipLabelActive: {
    color: "#ffffff",
  },
  chatPanel: {
    backgroundColor: colors.panelBackground,
    borderRadius: radii.hero,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
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
  messageList: {
    gap: 12,
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
  chatComposer: {
    backgroundColor: colors.panelBackground,
    borderRadius: radii.hero,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  chatInput: {
    minHeight: 132,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    fontSize: 15,
    textAlignVertical: "top",
  },
});
