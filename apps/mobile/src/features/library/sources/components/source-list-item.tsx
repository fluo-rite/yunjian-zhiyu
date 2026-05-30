import { Pressable, Text, View } from "react-native";

import type { KnowledgeSource } from "@/features/library/api";
import { SourceStatusBadge } from "@/features/library/sources/components/source-status-badge";
import { sourceListItemStyles as styles } from "@/features/library/sources/components/source-list-item.styles";
import { buildSourceMetaLine } from "@/features/library/utils/library-formatters";

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
    </Pressable>
  );
}
