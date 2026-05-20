import { Text, View } from "react-native";

import type { SourceStatus } from "../api";
import { getSourceStatusLabel } from "../utils/library-formatters";
import { sourceStatusBadgeStyles as styles } from "./source-status-badge.styles";

export function SourceStatusBadge(props: { status: SourceStatus }) {
  return (
    <View
      style={[
        styles.badge,
        props.status === "processing" && styles.processingBadge,
        props.status === "ready" && styles.readyBadge,
        props.status === "failed" && styles.failedBadge,
      ]}
    >
      <Text
        style={[
          styles.label,
          props.status === "processing" && styles.processingLabel,
          props.status === "ready" && styles.readyLabel,
          props.status === "failed" && styles.failedLabel,
        ]}
      >
        {getSourceStatusLabel(props.status)}
      </Text>
    </View>
  );
}
