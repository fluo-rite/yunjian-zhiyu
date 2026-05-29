import { Pressable, Text, View } from "react-native";

import type { KnowledgeCard } from "@/features/library/api";
import {
  buildCardSnippet,
  formatCompactDateTimeLabel,
  getSourceTypeLabel,
} from "@/features/library/utils/library-formatters";
import { CardStatusBadge } from "@/features/library/cards/components/card-status-badge";
import { cardListItemStyles as styles } from "@/features/library/cards/components/card-list-item.styles";

export type CardListItemMode = "browse" | "embedded" | "selectable";

function getCardTagKey(cardId: string, tag: string) {
  return `${cardId}:${tag}`;
}

export function CardListItem(props: {
  card: KnowledgeCard;
  mode?: CardListItemMode;
  selected?: boolean;
  selectable?: boolean;
  onPress?: () => void;
}) {
  const mode = props.mode ?? "browse";
  const tagPreview = props.card.tags.slice(0, 3);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!props.onPress}
      onPress={props.onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        mode === "embedded" && styles.cardEmbedded,
        props.selectable && styles.cardSelectable,
        props.selected && styles.cardSelected,
        pressed && props.onPress ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{props.card.title}</Text>
          <Text style={styles.meta}>
            {getSourceTypeLabel(props.card.sourceType)} · 更新�?{formatCompactDateTimeLabel(props.card.updatedAt)}
          </Text>
        </View>

        <View style={styles.headerAside}>
          <CardStatusBadge status={props.card.status} />
          {mode === "selectable" && props.selectable ? (
            <View style={[styles.selectionDot, props.selected && styles.selectionDotSelected]}>
              <Text style={[styles.selectionText, props.selected && styles.selectionTextSelected]}>
                {props.selected ? "已选中" : "选择"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.content}>{buildCardSnippet(props.card)}</Text>

      {tagPreview.length > 0 ? (
        <View style={styles.tagsRow}>
          {tagPreview.map((tag) => (
            <View key={getCardTagKey(props.card.id, tag)} style={styles.tag}>
              <Text style={styles.tagLabel}>{tag}</Text>
            </View>
          ))}
          {props.card.tags.length > tagPreview.length ? (
            <View style={styles.tag}>
              <Text style={styles.tagLabel}>+{props.card.tags.length - tagPreview.length}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

