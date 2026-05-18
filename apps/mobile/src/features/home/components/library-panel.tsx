import { Text, View } from "react-native";

import { libraryPanelStyles as styles } from "./library-panel.styles";

export function LibraryPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Library Placeholder</Text>
      <Text style={styles.description}>
        TODO: 在后续移动端知识库工作台重建时恢复来源、卡片和筛选逻辑。
      </Text>
    </View>
  );
}
