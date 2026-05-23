import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PrimaryButton } from "@/components/ui/primary-button";
import { type RootStackParamList } from "@/navigation/types";
import { useChatsQuery, useDeleteChatMutation } from "@/features/sessions/api";
import { SessionListItem } from "@/features/sessions/components/session-list-item";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import { sessionListScreenStyles as styles } from "@/features/sessions/screens/session-list-screen.styles";

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
      Alert.alert(
        sessionCopy.sessionList.deleteFailureTitle,
        error instanceof Error
          ? error.message
          : sessionCopy.sessionList.deleteFailureDescription,
      );
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.page}>
        <View style={styles.content}>
          <View style={styles.header}>
            <PrimaryButton
              label={sessionCopy.sessionList.newChatAction}
              onPress={() =>
                navigation.navigate("Chat", {
                  chatId: "draft-chat",
                  title: sessionCopy.chat.newChatTitle,
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
              <EmptyState
                description={sessionCopy.sessionList.loadingDescription}
                title={sessionCopy.sessionList.loadingTitle}
              />
            ) : null}

            {chatsQuery.isError ? (
              <ErrorState
                description={
                  chatsQuery.error instanceof Error
                    ? chatsQuery.error.message
                    : sessionCopy.sessionList.errorDescription
                }
                onRetry={() => {
                  chatsQuery.refetch().catch(() => {});
                }}
                retryLabel={sessionCopy.retry}
                title={sessionCopy.sessionList.errorTitle}
              />
            ) : null}

            {!chatsQuery.isLoading && !chatsQuery.isError ? (
              <FlashList
                contentContainerStyle={styles.listContent}
                data={chats}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <EmptyState
                    description={sessionCopy.sessionList.emptyDescription}
                    title={sessionCopy.sessionList.emptyTitle}
                  />
                }
                onRefresh={() => {
                  chatsQuery.refetch().catch(() => {});
                }}
                refreshing={chatsQuery.isRefetching}
                renderItem={({ item }) => {
                  const isMenuOpen = openMenuChatId === item.id;
                  const isDeletingCurrent =
                    deleteChatMutation.isPending && deleteChatMutation.variables === item.id;

                  return (
                    <SessionListItem
                      chat={item}
                      isDeleting={isDeletingCurrent}
                      isMenuOpen={isMenuOpen}
                      onDelete={() => {
                        handleDeleteChat(item.id).catch(() => {});
                      }}
                      onPress={() => {
                        setOpenMenuChatId(null);
                        navigation.navigate("Chat", {
                          chatId: item.id,
                          title: item.title,
                        });
                      }}
                      onToggleMenu={() => {
                        setOpenMenuChatId((current) => (current === item.id ? null : item.id));
                      }}
                    />
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
