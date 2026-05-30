import { StyleSheet } from "react-native";

import { spacing } from "@/theme/tokens";

export const cardListViewStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
});
