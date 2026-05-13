import { StyleSheet } from "react-native";

import { colors, radii } from "@/theme/tokens";

export const messageBubbleStyles = StyleSheet.create({
  messageBubble: {
    maxWidth: "92%",
    borderRadius: radii.xl,
    padding: 14,
    gap: 10,
  },
  assistantMessageBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.panelBorderStrong,
  },
  userMessageBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.brandSurface,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  messageRole: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  messageMeta: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  messageContent: {
    color: "#30423a",
    fontSize: 14,
    lineHeight: 22,
  },
  citationList: {
    gap: 8,
  },
  citationCard: {
    backgroundColor: colors.citationSurface,
    borderRadius: radii.sm,
    padding: 12,
    gap: 4,
  },
  citationType: {
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  citationTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  citationSnippet: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
});
