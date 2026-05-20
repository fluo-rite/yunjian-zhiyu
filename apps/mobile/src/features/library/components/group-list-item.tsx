import { Pressable, Text, View } from "react-native";

import type { CardGroup } from "../api";
import { formatCompactDateTimeLabel } from "../utils/library-formatters";
import { groupListItemStyles as styles } from "./group-list-item.styles";

export function GroupListItem(props: {
  group: CardGroup;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!props.onPress}
      onPress={props.onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        pressed && props.onPress ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{props.group.name}</Text>
          <Text style={styles.meta}>
            最近更新 {formatCompactDateTimeLabel(props.group.updatedAt)}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>分组</Text>
        </View>
      </View>
      <Text style={styles.description}>
        进入详情后可以查看组内卡片，并从全量卡片池里继续把卡片加入这个分组。
      </Text>
    </Pressable>
  );
}
