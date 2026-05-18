import { Text, View } from "react-native";

import { messageBubbleStyles as styles } from "./message-bubble.styles";

export function MessageBubble() {
  return (
    <View style={styles.bubble}>
      <Text style={styles.title}>Message Bubble Placeholder</Text>
      <Text style={styles.description}>TODO: 在恢复聊天业务时补回消息气泡样式与状态。</Text>
    </View>
  );
}
