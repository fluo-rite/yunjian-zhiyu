import { Text, View } from "react-native";

import { cardComposerStyles as styles } from "./card-composer.styles";

export function CardComposer() {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Card Composer Placeholder</Text>
      <Text style={styles.description}>
        TODO: 在后续知识沉淀流程设计明确后恢复卡片创建或确认相关 UI。
      </Text>
    </View>
  );
}
