import { Text, View } from "react-native";

import { authPanelStyles as styles } from "./auth-panel.styles";

export function AuthPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Auth Placeholder</Text>
      <Text style={styles.description}>
        TODO: 在后续移动端重建中恢复认证相关界面和交互。
      </Text>
    </View>
  );
}
