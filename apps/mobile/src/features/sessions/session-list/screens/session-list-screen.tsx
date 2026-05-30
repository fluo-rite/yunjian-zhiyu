import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PrimaryButton } from "@/components/ui/primary-button";
import { flattenInfiniteItems } from "@/lib/query/infinite-query";
import { type RootStackParamList } from "@/navigation/types";
import { useDeleteSessionMutation, useInfiniteSessionsQuery } from "@/features/sessions/api";
import { SessionListItem } from "@/features/sessions/session-list/components/session-list-item";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import { sessionListScreenStyles as styles } from "@/features/sessions/session-list/screens/session-list-screen.styles";

const footerContainerStyle = { alignItems: "center", paddingVertical: 16 } as const;
const footerHintTextStyle = { color: "#64748B" } as const;
const footerHintSpacingStyle = { color: "#64748B", marginTop: 8 } as const;

function ListSeparator() {
  return <View style={styles.listSeparator} />;
}

export function SessionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sessionsQuery = useInfiniteSessionsQuery();
  const deleteSessionMutation = useDeleteSessionMutation();
  const sessions = flattenInfiniteItems(sessionsQuery.data);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  async function handleDeleteSession(sessionId: string) {
    if (deleteSessionMutation.isPending) {
      return;
    }

    try {
      await deleteSessionMutation.mutateAsync(sessionId);
      setOpenMenuSessionId((current) => (current === sessionId ? null : current));
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
                  sessionId: "draft-session",
                  title: sessionCopy.chat.newChatTitle,
                  isNew: true,
                })
              }
            />
          </View>

          <View style={styles.section}>
            {openMenuSessionId ? (
              <Pressable
                onPress={() => {
                  setOpenMenuSessionId(null);
                }}
                style={styles.menuDismissLayer}
              />
            ) : null}

            {sessionsQuery.isLoading ? (
              <EmptyState
                description={sessionCopy.sessionList.loadingDescription}
                title={sessionCopy.sessionList.loadingTitle}
              />
            ) : null}

            {sessionsQuery.isError ? (
              <ErrorState
                description={
                  sessionsQuery.error instanceof Error
                    ? sessionsQuery.error.message
                    : sessionCopy.sessionList.errorDescription
                }
                onRetry={() => {
                  sessionsQuery.refetch().catch(() => {});
                }}
                retryLabel={sessionCopy.retry}
                title={sessionCopy.sessionList.errorTitle}
              />
            ) : null}

            {!sessionsQuery.isLoading && !sessionsQuery.isError ? (
              <FlashList
                contentContainerStyle={styles.listContent}
                data={sessions}
                ItemSeparatorComponent={ListSeparator}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <EmptyState
                    description={sessionCopy.sessionList.emptyDescription}
                    title={sessionCopy.sessionList.emptyTitle}
                  />
                }
                ListFooterComponent={
                  sessions.length > 0 ? (
                    <View style={styles.listContent}>
                      {sessionsQuery.isFetchingNextPage ? (
                        <View style={footerContainerStyle}>
                          <ActivityIndicator />
                          <Text style={footerHintSpacingStyle}>正在加载更多…</Text>
                        </View>
                      ) : !sessionsQuery.hasNextPage ? (
                        <View style={footerContainerStyle}>
                          <Text style={footerHintTextStyle}>没有更多内容了</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null
                }
                onEndReached={() => {
                  if (sessionsQuery.hasNextPage && !sessionsQuery.isFetchingNextPage) {
                    sessionsQuery.fetchNextPage().catch(() => {});
                  }
                }}
                onRefresh={() => {
                  sessionsQuery.refetch().catch(() => {});
                }}
                refreshing={sessionsQuery.isRefetching}
                renderItem={({ item }) => {
                  const isMenuOpen = openMenuSessionId === item.id;
                  const isDeletingCurrent =
                    deleteSessionMutation.isPending && deleteSessionMutation.variables === item.id;

                  return (
                    <SessionListItem
                      session={item}
                      isDeleting={isDeletingCurrent}
                      isMenuOpen={isMenuOpen}
                      onDelete={() => {
                        handleDeleteSession(item.id).catch(() => {});
                      }}
                      onPress={() => {
                        setOpenMenuSessionId(null);
                        navigation.navigate("Chat", {
                          sessionId: item.id,
                          title: item.title,
                        });
                      }}
                      onToggleMenu={() => {
                        setOpenMenuSessionId((current) => (current === item.id ? null : item.id));
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
