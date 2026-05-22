import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { colors } from "../../../theme/tokens";
import { type RootStackParamList } from "../../../navigation/types";
import { useChatsQuery, useDeleteChatMutation } from "../api";
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
  const deleteChatMutation = useDeleteChatMutation();
  const chats = chatsQuery.data?.items ?? [];
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);

  async function handleDeleteChat(chatId: string) {
    if (deleteChatMutation.isPending) {
      return;
    }

    try {
      await deleteChatMutation.mutateAsync(chatId);
      setOpenMenuChatId((current) => (current === chatId ? null : current));
    } catch (error) {
      Alert.alert("删除失败", error instanceof Error ? error.message : "暂时无法删除这个会话，请稍后再试。");
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={chatsQuery.isRefetching} onRefresh={chatsQuery.refetch} />}
        >
          <View style={styles.header}>
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
            {openMenuChatId ? (
              <Pressable
                onPress={() => {
                  setOpenMenuChatId(null);
                }}
                style={styles.menuDismissLayer}
              />
            ) : null}

            {chatsQuery.isLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>正在加载会话</Text>
                <Text style={styles.emptyText}>请稍候，我们正在同步你的会话列表。</Text>
              </View>
            ) : null}

            {chatsQuery.isError ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>会话加载失败</Text>
                <Text style={styles.emptyText}>
                  {chatsQuery.error instanceof Error ? chatsQuery.error.message : "请稍后再试。"}
                </Text>
                <PrimaryButton label="重新加载" onPress={() => chatsQuery.refetch()} />
              </View>
            ) : null}

            {!chatsQuery.isLoading && !chatsQuery.isError && chats.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>暂无会话</Text>
                <Text style={styles.emptyText}>从上方开始一段新的对话吧。</Text>
              </View>
            ) : null}

            {!chatsQuery.isLoading && !chatsQuery.isError
              ? chats.map((session) => {
                  const isMenuOpen = openMenuChatId === session.id;
                  const isDeletingCurrent = deleteChatMutation.isPending && deleteChatMutation.variables === session.id;

                  return (
                    <Pressable
                      key={session.id}
                      onPress={() => {
                        setOpenMenuChatId(null);
                        navigation.navigate("Chat", {
                          chatId: session.id,
                          title: session.title,
                        });
                      }}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.card,
                        isMenuOpen && styles.cardMenuOpen,
                        pressed && !isMenuOpen ? styles.cardPressed : null,
                      ]}
                    >
                      {isMenuOpen ? (
                        <Pressable
                          accessibilityRole="button"
                          disabled={isDeletingCurrent}
                          onPress={(event) => {
                            event.stopPropagation();
                            void handleDeleteChat(session.id);
                          }}
                          style={({ pressed }: { pressed: boolean }) => [
                            styles.deleteMenu,
                            pressed && !isDeletingCurrent ? styles.deleteMenuPressed : null,
                            isDeletingCurrent ? styles.deleteMenuDisabled : null,
                          ]}
                        >
                          <Text style={styles.deleteMenuText}>{isDeletingCurrent ? "删除中…" : "删除"}</Text>
                        </Pressable>
                      ) : null}

                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{session.title}</Text>
                        <Text style={styles.cardTime}>{formatUpdatedTime(session.updatedAt)}</Text>
                      </View>

                      <Text style={styles.cardText}>进入对话，继续查看消息或发起新的提问。</Text>

                      <View style={styles.cardFooter}>
                        <Pressable
                          accessibilityLabel="更多操作"
                          accessibilityRole="button"
                          disabled={deleteChatMutation.isPending && !isMenuOpen}
                          hitSlop={10}
                          onPress={(event) => {
                            event.stopPropagation();
                            setOpenMenuChatId((current) => (current === session.id ? null : session.id));
                          }}
                          style={({ pressed }: { pressed: boolean }) => [
                            styles.moreButton,
                            pressed ? styles.moreButtonPressed : null,
                          ]}
                        >
                          <Ionicons color={colors.textSecondary} name="ellipsis-horizontal" size={18} />
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })
              : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
