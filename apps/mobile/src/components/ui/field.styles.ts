import { StyleSheet } from "react-native";

import { colors, radii } from "@/theme/tokens";

export const fieldStyles = StyleSheet.create({
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: "top",
  },
});
