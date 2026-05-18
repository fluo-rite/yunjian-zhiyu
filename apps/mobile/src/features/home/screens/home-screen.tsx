import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { homeScreenStyles as styles } from "./home-screen.styles";

const preservedDirectories = [
  "src/app",
  "src/features",
  "src/components",
  "src/lib",
  "src/store",
  "src/theme",
  "src/assets",
];

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>React Native CLI</Text>
          <Text style={styles.title}>移动端原生工程骨架已接入。</Text>
          <Text style={styles.description}>
            当前已经脱离 Expo，保留原有 `src` 目录组织，并接入原生 React Native
            工程目录，后续可以直接按 RN 方式继续开发。
          </Text>
          <View style={styles.list}>
            {preservedDirectories.map((item) => (
              <Text key={item} style={styles.listItem}>
                • {item}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
