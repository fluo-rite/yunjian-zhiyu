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
      <Text style={styles.description}>打开后可查看原文、卡片结果与当前整理状态。</Text>
    </Pressable>
  );
}
