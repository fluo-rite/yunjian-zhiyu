import { Text, View } from "react-native";

import { cardItemStyles as styles } from "./card-item.styles";

export function CardItem() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Card Item Placeholder</Text>
      <Text style={styles.body}>TODO: 在移动端业务重建时恢复卡片展示组件。</Text>
    </View>
  );
}
