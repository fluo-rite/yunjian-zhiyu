import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { type SessionsStackParamList } from "../../../navigation/types";
import { sessionListScreenStyles as styles } from "./session-list-screen.styles";

const mockSessions = [
  {
    id: "chat-001",
    title: "复习操作系统线程模型",
    summary: "你上一轮整理了线程与进程的区别，以及用户态和内核态切换成本。",
    updatedAt: "今天 09:42",
  },
  {
    id: "chat-002",
    title: "整理英语阅读错题",
    summary: "这一组对话里已经记录了生词、长难句和题型误区。",
    updatedAt: "昨天 21:18",
  },
  {
    id: "chat-003",
    title: "构思知识库页面结构",
    summary: "目前先保留卡片、分组、资料三条主线，后续再接真实数据。",
    updatedAt: "昨天 16:05",
  },
];

export function SessionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SessionsStackParamList>>();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>会话</Text>
            <Text style={styles.title}>继续你上一次的思考。</Text>
            <Text style={styles.description}>
              先用静态数据把列表和详情页链路跑通，后面再对接真实会话接口。
            </Text>
          </View>
          <PrimaryButton
            label="新会话"
            onPress={() =>
              navigation.navigate("Chat", {
                chatId: "draft-chat",
                title: "新会话",
                isNew: true,
              })
            }
          />
        </View>

        <View style={styles.section}>
          {mockSessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() =>
                navigation.navigate("Chat", {
                  chatId: session.id,
                  title: session.title,
                })
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{session.title}</Text>
                <Text style={styles.cardTime}>{session.updatedAt}</Text>
              </View>
              <Text style={styles.cardText}>{session.summary}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
