import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import { type Card } from "@/lib/api";

import { cardItemStyles as styles } from "./card-item.styles";

export function CardItem(props: { card: Card; onDelete: (card: Card) => void }) {
  return (
    <View style={styles.cardItem}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{props.card.title}</Text>
          <Text style={styles.cardMeta}>
            {props.card.cardType} · {props.card.status}
          </Text>
        </View>
        <PrimaryButton label="删除" onPress={() => props.onDelete(props.card)} tone="danger" />
      </View>

      {props.card.summary ? <Text style={styles.cardSummary}>{props.card.summary}</Text> : null}

      <Text numberOfLines={4} style={styles.cardContent}>
        {props.card.content}
      </Text>

      {props.card.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {props.card.tags.map((tag) => (
            <View key={`${props.card.id}-${tag}`} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
