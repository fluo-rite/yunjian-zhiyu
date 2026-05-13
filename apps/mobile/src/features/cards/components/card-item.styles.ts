import { StyleSheet } from "react-native";

import { colors, radii } from "@/theme/tokens";

export const cardItemStyles = StyleSheet.create({
  cardItem: {
    backgroundColor: colors.inputBackground,
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitleGroup: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  cardMeta: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardSummary: {
    color: "#445650",
    fontSize: 14,
    fontWeight: "600",
  },
  cardContent: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: colors.brandMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
});
