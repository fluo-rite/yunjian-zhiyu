import { StyleSheet } from "react-native";

import { colors, radii } from "@/theme/tokens";

export const cardComposerStyles = StyleSheet.create({
  cardComposer: {
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
});
