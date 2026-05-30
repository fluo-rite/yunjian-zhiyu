import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  createSourceCardsMutationContext,
  useSourceCardsQuery,
  useSourceDetailQuery,
} from "@/features/library/api";
import { CardListView } from "@/features/library/shared/components/card-list-view";
import {
  SourceDetailCardsSectionHeader,
  SourceDetailManagementSection,
  SourceDetailOverviewSection,
  SourceDetailPendingSection,
  SourceDetailStatsSection,
} from "@/features/library/sources/components/source-detail-sections";
import { useSourceDetailController } from "@/features/library/sources/hooks/use-source-detail-controller";
import { sourceDetailScreenStyles as styles } from "@/features/library/sources/screens/source-detail-screen.styles";
import { countCardsByStatus } from "@/features/library/utils/library-formatters";
import { getSourceDetailCapabilities } from "@/features/library/utils/library-view-capabilities";
import { defaultSourceDetailMode } from "@/features/library/utils/library-view-modes";
import { type RootStackParamList } from "@/navigation/types";

export function SourceDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "SourceDetail">) {
  const mode = route.params.mode ?? defaultSourceDetailMode;
  const capabilities = getSourceDetailCapabilities(mode);

  const sourceQuery = useSourceDetailQuery(route.params.sourceId);
  const source = sourceQuery.data;
  const sourceCardsQuery = useSourceCardsQuery(
    capabilities.showGeneratedCards ? route.params.sourceId : null,
    {
      pollWhileProcessing: source?.status === "processing",
    },
  );
  const cards = useMemo(() => sourceCardsQuery.data?.items ?? [], [sourceCardsQuery.data?.items]);
  const pendingCards = useMemo(() => cards.filter((card) => card.status === "pending"), [cards]);
  const cardCounts = useMemo(() => countCardsByStatus(cards), [cards]);

  const controller = useSourceDetailController({
    sourceId: route.params.sourceId,
    source,
    cards,
    pendingCards,
    onDeleted: () => navigation.replace("SourceList"),
  });

  const listHeaderComponent = source ? (
    <View style={styles.headerContent}>
      <SourceDetailOverviewSection mode={mode} source={source} />
      {capabilities.showGeneratedCards ? (
        <SourceDetailStatsSection
          active={cardCounts.active}
          archived={cardCounts.archived}
          pending={cardCounts.pending}
        />
      ) : null}
      {capabilities.showPendingConfirm && pendingCards.length > 0 ? (
        <SourceDetailPendingSection
          isConfirming={controller.confirmCardsMutation.isPending}
          onConfirm={controller.confirmSelectedPendingCards}
          onToggleSelectAll={() => {
            if (controller.selectedPendingIds.length === pendingCards.length) {
              controller.clearPendingSelection();
              return;
            }

            controller.selectAllPending();
          }}
          pendingCount={pendingCards.length}
          selectedCount={controller.selectedPendingIds.length}
        />
      ) : null}
      {capabilities.showGeneratedCards ? <SourceDetailCardsSectionHeader count={cards.length} /> : null}
    </View>
  ) : null;

  const listFooterComponent =
    capabilities.showManageActions && source ? (
      <SourceDetailManagementSection
        isDeleting={controller.deleteSourceMutation.isPending}
        linkedCount={cards.length}
        onDeleteSourceAndCards={() => controller.deleteSource(cards.length > 0)}
        onDeleteSourceOnly={() => controller.deleteSource(false)}
      />
    ) : null;

  const listEmptyComponent = useMemo(() => {
    if (sourceQuery.isLoading || sourceCardsQuery.isLoading) {
      return <EmptyState description="请稍等，我们正在同步来源详情与卡片内容。" title="正在加载来源" />;
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

  if (mode === "card_source_readonly") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
        <ScreenHeader
          onBack={() => navigation.goBack()}
          subtitle="卡片来源"
          title={route.params.sourceName ?? source?.name ?? "知识来源详情"}
        />

        {sourceQuery.isLoading ? (
          <View style={styles.scrollContent}>
            <EmptyState description="请稍等，我们正在加载来源详情。" title="正在加载来源" />
          </View>
        ) : null}

        {sourceQuery.isError ? (
          <View style={styles.scrollContent}>
            <ErrorState
              description={sourceQuery.error instanceof Error ? sourceQuery.error.message : "暂时无法读取当前来源，请稍后再试。"}
              onRetry={() => sourceQuery.refetch()}
              retryLabel="重新加载"
              title="来源加载失败"
            />
          </View>
        ) : null}

        {source ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>{listHeaderComponent}</ScrollView>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={
          capabilities.showJumpToFilteredCards
            ? () =>
                navigation.navigate("CardList", {
                  sourceId: route.params.sourceId,
                  sourceName: route.params.sourceName,
                })
            : undefined
        }
        rightLabel={capabilities.showJumpToFilteredCards ? "筛选卡片" : undefined}
        subtitle="来源详情"
        title={route.params.sourceName ?? source?.name ?? "知识来源详情"}
      />

      <CardListView
        isItemSelectable={(card) => card.status === "pending"}
        items={cards}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={listFooterComponent}
        ListHeaderComponent={listHeaderComponent}
        mode="selectable"
        onPressItem={(card) =>
          navigation.navigate("CardDetail", {
            cardId: card.id,
            cardMutationContext: createSourceCardsMutationContext(route.params.sourceId),
            sourceContextId: route.params.sourceId,
          })
        }
        onRefresh={() => {
          sourceQuery.refetch();
          sourceCardsQuery.refetch();
        }}
        onToggleSelect={(card) => controller.togglePendingCard(card.id)}
        refreshing={sourceQuery.isRefetching || sourceCardsQuery.isRefetching}
        selectedIds={controller.selectedPendingSet}
      />
    </SafeAreaView>
  );
}
