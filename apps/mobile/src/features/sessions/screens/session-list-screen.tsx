import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { type RootStackParamList } from "../../../navigation/types";
import { useChatsQuery } from "../api";
import { sessionListScreenStyles as styles } from "./session-list-screen.styles";

function formatUpdatedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hours}:${minutes}`;
}

export function SessionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const chatsQuery = useChatsQuery();
  const chats = chatsQuery.data?.items ?? [];

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={chatsQuery.isRefetching} onRefresh={chatsQuery.refetch} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>会话</Text>
            <Text style={styles.title}>继续你上一次的整理与提问</Text>
            <Text style={styles.description}>
              这里已经接入真实会话列表。你可以继续已有对话，也可以从这里发起一轮新的整理。
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
          {chatsQuery.isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>正在加载会话</Text>
              <Text style={styles.emptyText}>稍等一下，正在从服务端读取你的会话列表。</Text>
            </View>
          ) : null}

          {chatsQuery.isError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>会话列表加载失败</Text>
              <Text style={styles.emptyText}>
                {chatsQuery.error instanceof Error ? chatsQuery.error.message : "请稍后再试。"}
              </Text>
              <PrimaryButton
                label="重新加载"
                onPress={() => chatsQuery.refetch()}
              />
            </View>
          ) : null}

          {!chatsQuery.isLoading && !chatsQuery.isError && chats.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>还没有会话</Text>
              <Text style={styles.emptyText}>
                从右上角开始一个新会话，后续这里会沉淀你的历史问答。
              </Text>
            </View>
          ) : null}

          {!chatsQuery.isLoading && !chatsQuery.isError
            ? chats.map((session) => (
                <Pressable
                  key={session.id}
                  onPress={() =>
                    navigation.navigate("Chat", {
                      chatId: session.id,
                      title: session.title,
                    })
                  }
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{session.title}</Text>
                    <Text style={styles.cardTime}>{formatUpdatedTime(session.updatedAt)}</Text>
                  </View>
                  <Text style={styles.cardText}>
                    进入这场对话，继续查看历史消息、发起追问或沉淀新的知识内容。
                  </Text>
                </Pressable>
              ))
            : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
