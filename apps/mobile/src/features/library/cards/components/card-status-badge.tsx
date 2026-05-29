import { Text, View } from "react-native";

import type { CardStatus } from "@/features/library/api";
import { getCardStatusLabel } from "@/features/library/utils/library-formatters";
import { cardStatusBadgeStyles as styles } from "@/features/library/cards/components/card-status-badge.styles";

export function CardStatusBadge(props: { status: CardStatus }) {
  return (
    <View
      style={[
        styles.badge,
        props.status === "pending" && styles.pendingBadge,
        props.status === "active" && styles.activeBadge,
        props.status === "archived" && styles.archivedBadge,
      ]}
    >
      <Text
        style={[
          styles.label,
          props.status === "pending" && styles.pendingLabel,
          props.status === "active" && styles.activeLabel,
          props.status === "archived" && styles.archivedLabel,
        ]}
      >
        {getCardStatusLabel(props.status)}
      </Text>
    </View>
  );
}

