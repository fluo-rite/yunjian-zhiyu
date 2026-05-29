import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type RootStackParamList } from "@/navigation/types";
import { libraryHomeScreenStyles as styles } from "@/features/library/screens/library-home-screen.styles";

export function LibraryHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.entryList}>
          <Pressable
            onPress={() => navigation.navigate("CardList")}
            style={({ pressed }: { pressed: boolean }) => [
              styles.entryCard,
              pressed && styles.entryCardPressed,
            ]}
          >
            <Text style={styles.entryEyebrow}>全部内容</Text>
            <Text style={styles.entryTitle}>知识卡片</Text>
            <Text style={styles.entryText}>浏览、搜索和筛选你的全部卡片。</Text>
            <Text style={styles.entryLink}>查看卡片</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("CardGroupList")}
            style={({ pressed }: { pressed: boolean }) => [
              styles.entryCard,
              pressed && styles.entryCardPressed,
            ]}
          >
            <Text style={styles.entryEyebrow}>主题整理</Text>
            <Text style={styles.entryTitle}>卡片分组</Text>
            <Text style={styles.entryText}>按主题管理卡片，让资料结构更清晰。</Text>
            <Text style={styles.entryLink}>查看分组</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("SourceList")}
            style={({ pressed }: { pressed: boolean }) => [
              styles.entryCard,
              pressed && styles.entryCardPressed,
            ]}
          >
            <Text style={styles.entryEyebrow}>资料来源</Text>
            <Text style={styles.entryTitle}>知识来源</Text>
            <Text style={styles.entryText}>查看不同资料、笔记或消息整理出的内容。</Text>
            <Text style={styles.entryLink}>查看来源</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
