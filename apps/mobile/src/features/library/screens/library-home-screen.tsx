import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { type LibraryStackParamList } from "../../../navigation/types";
import { libraryHomeScreenStyles as styles } from "./library-home-screen.styles";

export function LibraryHomeScreen({
  navigation,
}: NativeStackScreenProps<LibraryStackParamList, "LibraryHome">) {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>知识工作台</Text>
          <Text style={styles.title}>围绕卡片组织你的学习资料</Text>
          <Text style={styles.description}>
            知识卡片是主浏览对象，卡片分组和知识来源是两种组织入口。后续的搜索、
            筛选、确认与沉淀流程都会从这里继续展开。
          </Text>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchCopy}>
            <Text style={styles.searchLabel}>快速开始</Text>
            <Text style={styles.searchTitle}>先从知识卡片开始找内容</Text>
            <Text style={styles.searchDescription}>
              统一的卡片浏览页会承接后续的关键词搜索、状态筛选、分组筛选和来源筛选。
            </Text>
          </View>
          <PrimaryButton label="进入卡片页" onPress={() => navigation.navigate("CardList")} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>三个入口</Text>
          <Text style={styles.sectionDescription}>
            首页只负责分发入口，不在这里展开卡片列表，避免卡片变多后页面层级过重。
          </Text>
        </View>

        <View style={styles.entryList}>
          <Pressable
            onPress={() => navigation.navigate("CardList")}
            style={({ pressed }) => [styles.entryCard, pressed && styles.entryCardPressed]}
          >
            <Text style={styles.entryEyebrow}>主浏览页</Text>
            <Text style={styles.entryTitle}>知识卡片</Text>
            <Text style={styles.entryText}>
              浏览全部卡片内容，并在后续版本中按状态、分组、来源快速筛选。
            </Text>
            <Text style={styles.entryLink}>查看全部卡片</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("CardGroupList")}
            style={({ pressed }) => [styles.entryCard, pressed && styles.entryCardPressed]}
          >
            <Text style={styles.entryEyebrow}>主题组织</Text>
            <Text style={styles.entryTitle}>卡片分组</Text>
            <Text style={styles.entryText}>
              以主题或专题组织卡片，后续会支持进入分组详情后查看组内卡片与添加卡片。
            </Text>
            <Text style={styles.entryLink}>查看卡片分组</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("SourceList")}
            style={({ pressed }) => [styles.entryCard, pressed && styles.entryCardPressed]}
          >
            <Text style={styles.entryEyebrow}>来源追溯</Text>
            <Text style={styles.entryTitle}>知识来源</Text>
            <Text style={styles.entryText}>
              以文本、文档或消息来源为入口，后续会在详情页确认该来源生成的 pending 卡片。
            </Text>
            <Text style={styles.entryLink}>查看知识来源</Text>
          </Pressable>
        </View>

        <View style={styles.roadmapCard}>
          <Text style={styles.roadmapTitle}>当前进度</Text>
          <Text style={styles.roadmapText}>
            第一批任务已经补齐知识区路由、API 骨架与首页入口页。下一批将优先接通卡片主浏览页和来源列表页。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
