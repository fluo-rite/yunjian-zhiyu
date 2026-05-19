import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { sessionListScreenStyles as styles } from "./session-list-screen.styles";

export function SessionListScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>会话</Text>
          <Text style={styles.title}>会话列表占位页</Text>
          <Text style={styles.description}>
            这里下一步会放会话列表、新会话入口，以及点击后进入不展示底栏的聊天详情页。
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>接下来会补什么</Text>
            <Text style={styles.cardText}>会话标题、最近消息摘要、更新时间和新会话按钮。</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
