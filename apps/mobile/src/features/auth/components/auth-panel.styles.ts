import { StyleSheet } from "react-native";

import { colors, radii, shadows } from "@/theme/tokens";

export const authPanelStyles = StyleSheet.create({
  authCard: {
    backgroundColor: colors.panelBackground,
    borderRadius: radii.hero,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    ...shadows.card,
  },
  heroRow: {
    gap: 8,
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
  segmentRow: {
    flexDirection: "row",
    gap: 12,
  },
});
