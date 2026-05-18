import { Text, View } from "react-native";

import { chatWorkspaceStyles as styles } from "./chat-workspace.styles";

export function ChatWorkspace() {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Chat Workspace Placeholder</Text>
      <Text style={styles.description}>
        TODO: 在后续移动端重建时恢复对话页面、消息流和输入区。
      </Text>
    </View>
  );
}
