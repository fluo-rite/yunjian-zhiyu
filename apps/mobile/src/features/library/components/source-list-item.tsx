import { Pressable, Text, View } from "react-native";

import type { KnowledgeSource } from "../api";
import { buildSourceMetaLine } from "../utils/library-formatters";
import { SourceStatusBadge } from "./source-status-badge";
import { sourceListItemStyles as styles } from "./source-list-item.styles";

export function SourceListItem(props: {
  source: KnowledgeSource;
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
          <Text style={styles.title}>{props.source.name}</Text>
          <Text style={styles.meta}>{buildSourceMetaLine(props.source)}</Text>
        </View>
        <SourceStatusBadge status={props.source.status} />
      </View>
      <Text style={styles.description}>
        进入来源详情后可以查看原始内容、生成卡片以及待确认卡片的处理进度。
      </Text>
    </Pressable>
  );
}
