import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, FlatList, Text, View } from "react-native";
import { useMemo } from "react";

import { PrimaryButton } from "@/components/ui/primary-button";
import { CardComposer } from "@/features/cards/components/card-composer";
import { CardItem } from "@/features/cards/components/card-item";
import { homeStyles as styles } from "@/features/home/styles";
import {
  clearPersistedSession,
  deleteCard,
  extractApiError,
  fetchCards,
  fetchCurrentUser,
  setAccessToken,
  type Card,
} from "@/lib/api";
import { clearSession } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

export function LibraryPanel() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
  });

  const cardsQuery = useQuery({
    queryKey: ["cards", "list"],
    queryFn: () => fetchCards({ status: "active" }),
    enabled: meQuery.isSuccess,
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cards", "list"] });
    },
    onError: (error) => {
      Alert.alert("删除卡片失败", extractApiError(error));
    },
  });

  const signOut = async () => {
    await clearPersistedSession();
    setAccessToken(null);
    dispatch(clearSession());
    queryClient.clear();
  };

  const onDeleteCard = (card: Card) => {
    Alert.alert("删除卡片", `确认删除「${card.title}」吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => deleteMutation.mutate(card.id),
      },
    ]);
  };

  const cardCountLabel = useMemo(() => {
    if (!cardsQuery.data) {
      return "0 张卡片";
    }
    return `${cardsQuery.data.pagination.total} 张卡片`;
  }, [cardsQuery.data]);

  const currentUser = meQuery.data;

  if (meQuery.isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#163d33" size="large" />
        <Text style={styles.centerStateText}>正在恢复你的学习空间...</Text>
      </View>
    );
  }

  if (meQuery.isError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerStateTitle}>登录状态已失效</Text>
        <Text style={styles.centerStateText}>{extractApiError(meQuery.error)}</Text>
        <PrimaryButton label="重新登录" onPress={() => void signOut()} />
      </View>
    );
  }

  return (
    <FlatList
      ListEmptyComponent={
        cardsQuery.isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#163d33" size="large" />
            <Text style={styles.centerStateText}>正在加载你的知识卡片...</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>还没有知识卡片</Text>
            <Text style={styles.emptyStateText}>
              先创建第一张卡片，后面我们再把 AI 对话和导卡流程接上来。
            </Text>
          </View>
        )
      }
      ListHeaderComponent={
        <View style={styles.libraryHeader}>
          <View style={styles.libraryHero}>
            <Text style={styles.heroEyebrow}>第一开发阶段</Text>
            <Text style={styles.heroTitle}>
              欢迎回来，{currentUser?.nickname ?? currentUser?.username ?? "同学"}
            </Text>
            <Text style={styles.heroSubtitle}>
              现在已经连上后端认证和卡片 CRUD 了，这里先作为知识库工作台。
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>当前知识库</Text>
              <Text style={styles.summaryValue}>{cardCountLabel}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>联网 / AI</Text>
              <Text style={styles.summaryValue}>待下一阶段</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <PrimaryButton
              label="刷新"
              onPress={() => {
                void meQuery.refetch();
                void cardsQuery.refetch();
              }}
              tone="secondary"
            />
            <PrimaryButton label="退出登录" onPress={() => void signOut()} tone="danger" />
          </View>

          <CardComposer
            onCreated={() => {
              void cardsQuery.refetch();
            }}
          />

          <Text style={styles.sectionTitle}>知识卡片列表</Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      data={cardsQuery.data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CardItem card={item} onDelete={onDeleteCard} />}
    />
  );
}
