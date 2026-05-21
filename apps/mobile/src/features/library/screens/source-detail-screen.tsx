import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type RootStackParamList } from "../../../navigation/types";
import {
  useConfirmCardsMutation,
  useDeleteSourceMutation,
  useSourceCardsQuery,
  useSourceDetailQuery,
} from "../api";
import { CardListView } from "../components/card-list-view";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { SourceStatusBadge } from "../components/source-status-badge";
import { countCardsByStatus, formatDateTimeLabel, getSourceTypeLabel } from "../utils/library-formatters";
import { getStableArray, retainExistingIds } from "../utils/library-state";
import { sourceDetailScreenStyles as styles } from "./source-detail-screen.styles";

export function SourceDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "SourceDetail">) {
  const sourceQuery = useSourceDetailQuery(route.params.sourceId);
  const sourceCardsQuery = useSourceCardsQuery(route.params.sourceId);
  const confirmCardsMutation = useConfirmCardsMutation();
  const deleteSourceMutation = useDeleteSourceMutation();
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

  const source = sourceQuery.data;
  const cards = getStableArray(sourceCardsQuery.data?.items);
  const pendingCards = useMemo(() => cards.filter((card) => card.status === "pending"), [cards]);
  const cardCounts = useMemo(() => countCardsByStatus(cards), [cards]);
  const selectedPendingSet = useMemo(() => new Set(selectedPendingIds), [selectedPendingIds]);

  useEffect(() => {
    const pendingIdSet = new Set(pendingCards.map((card) => card.id));
    setSelectedPendingIds((current) => retainExistingIds(current, pendingIdSet));
  }, [pendingCards]);

  function handleToggleSelect(cardId: string) {
    setSelectedPendingIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  function handleSelectAllPending() {
    setSelectedPendingIds(pendingCards.map((card) => card.id));
  }

  function handleClearSelection() {
    setSelectedPendingIds([]);
  }

  async function handleConfirmSelected() {
    if (selectedPendingIds.length === 0 || confirmCardsMutation.isPending) {
      return;
    }

    try {
      const confirmedCount = selectedPendingIds.length;
      await confirmCardsMutation.mutateAsync({ cardIds: selectedPendingIds });
      setSelectedPendingIds([]);
      Alert.alert("确认完成", `已确认 ${confirmedCount} 张卡片。`);
    } catch (error) {
      Alert.alert("确认失败", error instanceof Error ? error.message : "暂时无法确认这些卡片，请稍后再试。");
    }
  }

  function handleDeleteSource(deleteCards: boolean) {
    if (!source || deleteSourceMutation.isPending) {
      return;
    }

    const linkedCount = cards.length;
    const actionText = deleteCards ? "删除来源与卡片" : "只删除来源";
    const description = deleteCards
      ? `删除后会同时移除这条来源及其关联的 ${linkedCount} 张卡片。`
      : linkedCount > 0
        ? `删除后会移除这条来源，但会保留已生成的 ${linkedCount} 张卡片。`
        : "删除后会移除这条来源记录。";

    Alert.alert("删除知识来源", description, [
      { text: "取消", style: "cancel" },
      {
        text: actionText,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSourceMutation.mutateAsync({
              sourceId: route.params.sourceId,
              deleteCards,
            });
            navigation.replace("SourceList");
          } catch (error) {
            Alert.alert("删除失败", error instanceof Error ? error.message : "暂时无法删除这条来源，请稍后再试。");
          }
        },
      },
    ]);
  }

  const listHeaderComponent = useMemo(() => {
    if (!source) {
      return null;
    }

    return (
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{source.name}</Text>
              <Text style={styles.heroMeta}>
                {getSourceTypeLabel(source.sourceType)} · 最近更新 {formatDateTimeLabel(source.updatedAt)}
              </Text>
            </View>
            <SourceStatusBadge status={source.status} />
          </View>
          <Text style={styles.heroText}>查看原始内容、卡片结果，以及当前需要确认的内容。</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>待确认</Text>
            <Text style={styles.statValue}>{cardCounts.pending}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>已确认</Text>
            <Text style={styles.statValue}>{cardCounts.active}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>已归档</Text>
            <Text style={styles.statValue}>{cardCounts.archived}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>原始内容</Text>
          <Text style={styles.sectionText}>{source.rawContent}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>来源管理</Text>
          <Text style={styles.sectionText}>
            当前来源关联 {cards.length} 张卡片。你可以只删除来源，或同时删除相关卡片。
          </Text>
          <View style={styles.actionRow}>
            <PrimaryButton
              label={deleteSourceMutation.isPending ? "处理中…" : "只删除来源"}
              onPress={() => handleDeleteSource(false)}
              variant="secondary"
            />
            <PrimaryButton
              label={
                deleteSourceMutation.isPending
                  ? "处理中…"
                  : cards.length > 0
                    ? "删除来源与卡片"
                    : "删除来源"
              }
              onPress={() => handleDeleteSource(cards.length > 0)}
            />
          </View>
        </View>

        {pendingCards.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>待确认卡片</Text>
            <Text style={styles.sectionText}>选中需要保留的卡片后，可一次性确认加入卡片库。</Text>
            <View style={styles.actionRow}>
              <PrimaryButton
                label={selectedPendingIds.length === pendingCards.length ? "清空选择" : "全选待确认"}
                onPress={selectedPendingIds.length === pendingCards.length ? handleClearSelection : handleSelectAllPending}
                variant="secondary"
              />
              <PrimaryButton
                disabled={selectedPendingIds.length === 0 || confirmCardsMutation.isPending}
                label={confirmCardsMutation.isPending ? "确认中…" : `确认选中 (${selectedPendingIds.length})`}
                onPress={handleConfirmSelected}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>卡片列表</Text>
          <Text style={styles.sectionCaption}>共 {cards.length} 张</Text>
        </View>
      </View>
    );
  }, [
    cardCounts.active,
    cardCounts.archived,
    cardCounts.pending,
    cards.length,
    confirmCardsMutation.isPending,
    deleteSourceMutation.isPending,
    pendingCards.length,
    selectedPendingIds.length,
    source,
  ]);

  const listEmptyComponent = useMemo(() => {
    if (sourceQuery.isLoading || sourceCardsQuery.isLoading) {
      return <EmptyState description="请稍候，我们正在同步来源详情与卡片内容。" title="正在加载来源" />;
    }

    if (sourceQuery.isError || sourceCardsQuery.isError) {
      const error =
        sourceQuery.error instanceof Error
          ? sourceQuery.error.message
          : sourceCardsQuery.error instanceof Error
            ? sourceCardsQuery.error.message
            : "暂时无法读取当前来源，请稍后再试。";

      return (
        <ErrorState
          description={error}
          onRetry={() => {
            sourceQuery.refetch();
            sourceCardsQuery.refetch();
          }}
          retryLabel="重新加载"
          title="来源加载失败"
        />
      );
    }

    return (
      <EmptyState
        actionLabel="刷新"
        description="这条来源暂时还没有生成卡片。"
        onActionPress={() => {
          sourceQuery.refetch();
          sourceCardsQuery.refetch();
        }}
        title="暂无卡片"
      />
    );
  }, [sourceCardsQuery, sourceQuery]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={() =>
          navigation.navigate("CardList", {
            sourceId: route.params.sourceId,
            sourceName: route.params.sourceName,
          })
        }
        rightLabel="筛选卡片"
        subtitle="来源详情"
        title={route.params.sourceName ?? source?.name ?? "知识来源详情"}
      />

      <CardListView
        isItemSelectable={(card) => card.status === "pending"}
        items={cards}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        mode="selectable"
        onPressItem={(card) => navigation.navigate("CardDetail", { cardId: card.id })}
        onRefresh={() => {
          sourceQuery.refetch();
          sourceCardsQuery.refetch();
        }}
        onToggleSelect={(card) => handleToggleSelect(card.id)}
        refreshing={sourceQuery.isRefetching || sourceCardsQuery.isRefetching}
        selectedIds={selectedPendingSet}
      />
    </SafeAreaView>
  );
}
