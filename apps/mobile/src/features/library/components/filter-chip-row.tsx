import { Pressable, ScrollView, Text } from "react-native";

import { filterChipRowStyles as styles } from "@/features/library/components/filter-chip-row.styles";

export type FilterChipItem<T extends string> = {
  key: T;
  label: string;
};

export function FilterChipRow<T extends string>(props: {
  items: ReadonlyArray<FilterChipItem<T>>;
  selectedKey: T;
  onSelect: (key: T) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {props.items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => props.onSelect(item.key)}
          style={({ pressed }: { pressed: boolean }) => [
            styles.chip,
            props.selectedKey === item.key && styles.chipActive,
            pressed && styles.chipPressed,
          ]}
        >
          <Text
            style={[
              styles.chipLabel,
              props.selectedKey === item.key && styles.chipLabelActive,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
