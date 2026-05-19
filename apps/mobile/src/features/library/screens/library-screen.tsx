import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { libraryScreenStyles as styles } from "./library-screen.styles";

export function LibraryScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>知识库</Text>
          <Text style={styles.title}>知识库占位页</Text>
          <Text style={styles.description}>
            这里后续会承接知识卡片、卡片分组、知识资料三条主线，并继续拆成各自的二级详情页。
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>第一批入口</Text>
            <Text style={styles.cardText}>知识卡片、卡片分组、知识资料，都会从这里继续展开。</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
