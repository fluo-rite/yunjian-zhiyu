import { StyleSheet } from "react-native";

import { colors, radii } from "@/theme/tokens";

export const homeScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  authContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  centerState: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  centerStateText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  workspaceSwitcher: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  workspaceTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  workspaceToggleBar: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.warmSurfaceAlt,
    borderRadius: radii.xxl,
    padding: 6,
  },
  workspaceButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
  },
  workspaceButtonActive: {
    backgroundColor: colors.brand,
  },
  workspaceButtonLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "700",
  },
  workspaceButtonLabelActive: {
    color: "#ffffff",
  },
});
