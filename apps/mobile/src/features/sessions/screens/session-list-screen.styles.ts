import { StyleSheet } from "react-native";

import { colors, spacing } from "../../../theme/tokens";

export const sessionListScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  section: {
    flex: 1,
    position: "relative",
    minHeight: 0,
  },
  menuDismissLayer: {
    position: "absolute",
    top: -spacing.lg,
    right: -spacing.xl,
    bottom: -spacing.xxl,
    left: -spacing.xl,
    zIndex: 15,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
});
