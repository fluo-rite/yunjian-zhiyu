import { StyleSheet } from "react-native";

import { colors, radii } from "../../../theme/tokens";

export const cardItemStyles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
