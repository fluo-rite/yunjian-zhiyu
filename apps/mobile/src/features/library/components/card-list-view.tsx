import type { ReactElement } from "react";
import { FlatList } from "react-native";

import type { KnowledgeCard } from "../api";
import { CardListItem, type CardListItemMode } from "./card-list-item";
import { cardListViewStyles as styles } from "./card-list-view.styles";

export function CardListView(props: {
  items: KnowledgeCard[];
  mode?: CardListItemMode;
  selectedIds?: ReadonlySet<string>;
  isItemSelectable?: (card: KnowledgeCard) => boolean;
  onPressItem?: (card: KnowledgeCard) => void;
  onToggleSelect?: (card: KnowledgeCard) => void;
  ListHeaderComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const mode = props.mode ?? "browse";

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={props.items}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListEmptyComponent={props.ListEmptyComponent}
      ListHeaderComponent={props.ListHeaderComponent}
      onRefresh={props.onRefresh}
      refreshing={props.refreshing}
      renderItem={({ item }) => {
        const selectable =
          mode === "selectable" ? (props.isItemSelectable ? props.isItemSelectable(item) : true) : false;
        const selected = props.selectedIds?.has(item.id) ?? false;

        return (
          <CardListItem
            card={item}
            mode={mode}
            onPress={() => {
              if (selectable && props.onToggleSelect) {
                props.onToggleSelect(item);
                return;
              }

              props.onPressItem?.(item);
            }}
            selectable={selectable}
            selected={selected}
          />
        );
      }}
      scrollIndicatorInsets={{ right: 1 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
