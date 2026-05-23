import { useState } from "react";
import { Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type RootStackParamList } from "../../../navigation/types";
import { type CardStatus, useCardsQuery } from "../api";
import { CardListView } from "../components/card-list-view";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { FilterChipRow, type FilterChipItem } from "../components/filter-chip-row";
import { libraryCopy } from "../utils/library-copy";
import { buildReadonlyCardDetailParams } from "../utils/library-navigation";
import { getCardListCapabilities } from "../utils/library-view-capabilities";
import { defaultCardListMode } from "../utils/library-view-modes";
import { getStableArray } from "../utils/library-state";
import { cardListScreenStyles as styles } from "./card-list-screen.styles";

type StatusFilterKey = "all" | CardStatus;

const statusFilterItems: ReadonlyArray<FilterChipItem<StatusFilterKey>> = [
  { key: "all", label: "全部状态" },
  { key: "pending", label: "待确认" },
  { key: "active", label: "已确认" },
  { key: "archived", label: "已归档" },
];

function toStatusFilterValue(filterKey: StatusFilterKey): CardStatus | undefined {
  return filterKey === "all" ? undefined : filterKey;
}

export function CardListScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "CardList">) {
  const mode = route.params?.mode ?? defaultCardListMode;
  const capabilities = getCardListCapabilities(mode);
  const [searchInput, setSearchInput] = useState(route.params?.keyword ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>(route.params?.status ?? "all");

  const cardsQuery = useCardsQuery({
    status: capabilities.showStatusFilter ? toStatusFilterValue(statusFilter) : undefined,
    sourceId: route.params?.sourceId,
    groupId: route.params?.groupId,
    keyword: capabilities.showSearch ? searchInput.trim() || undefined : undefined,
  });

  const cards = getStableArray(cardsQuery.data?.items);
  const hasContextFilter = Boolean(route.params?.sourceId || route.params?.groupId);
  const hasLocalFilters = Boolean(searchInput.trim() || statusFilter !== "all");
  const screenTitle =
    mode === "source_related"
      ? "相关卡片"
      : route.params?.sourceName
        ? route.params.sourceName
        : route.params?.groupName
          ? route.params.groupName
          : "知识卡片";
  const screenSubtitle =
    mode === "source_related"
      ? "来自同一来源"
      : route.params?.sourceName
        ? "来源卡片"
        : route.params?.groupName
          ? "分组卡片"
          : "全部卡片";

  function handleResetLocalFilters() {
    setSearchInput("");
    setStatusFilter("all");
  }

  function handleResetAllFilters() {
    navigation.replace("CardList");
  }

  const listHeaderComponent = (
    <View style={styles.headerContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{mode === "source_related" ? "相关卡片" : "卡片列表"}</Text>
        <Text style={styles.heroText}>
          {mode === "source_related"
            ? "仅展示与当前卡片同源的卡片，方便快速浏览相关内容。"
            : "搜索、筛选并继续浏览你整理过的内容。"}
        </Text>
        {capabilities.showHeroContext && route.params?.sourceName ? (
          <Text style={styles.contextText}>来源：{route.params.sourceName}</Text>
        ) : null}
        {capabilities.showHeroContext && route.params?.groupName ? (
          <Text style={styles.contextText}>分组：{route.params.groupName}</Text>
        ) : null}
        {cardsQuery.data?.pagination ? (
          <Text style={styles.resultMeta}>共 {cardsQuery.data.pagination.total} 张卡片</Text>
        ) : null}
      </View>

      {capabilities.showSearch || capabilities.showStatusFilter ? (
        <View style={styles.filterCard}>
          {capabilities.showSearch ? (
            <Field
              label="搜索卡片"
              onChangeText={setSearchInput}
              placeholder="搜索标题、内容或标签"
              value={searchInput}
            />
          ) : null}

          {capabilities.showStatusFilter ? (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>状态</Text>
              <FilterChipRow items={statusFilterItems} onSelect={setStatusFilter} selectedKey={statusFilter} />
            </View>
          ) : null}

          {hasLocalFilters ? (
            <PrimaryButton
              label={libraryCopy.cardList.clearLocalFilters}
              onPress={handleResetLocalFilters}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const listEmptyComponent = cardsQuery.isLoading ? (
    <EmptyState description={libraryCopy.cardList.loadingDescription} title={libraryCopy.cardList.loadingTitle} />
  ) : cardsQuery.isError ? (
    <ErrorState
      description={cardsQuery.error instanceof Error ? cardsQuery.error.message : libraryCopy.loadFailed}
      onRetry={() => cardsQuery.refetch()}
      retryLabel={libraryCopy.retry}
      title={libraryCopy.cardList.errorTitle}
    />
  ) : (
    <EmptyState
      actionLabel={
        mode === "manage"
          ? hasContextFilter
            ? libraryCopy.cardList.showAllCards
            : hasLocalFilters
              ? libraryCopy.cardList.clearLocalFilters
              : undefined
          : undefined
      }
      description={
        mode === "source_related"
          ? "当前来源下还没有其他可浏览的卡片。"
          : hasContextFilter || hasLocalFilters
            ? libraryCopy.cardList.emptyFilteredDescription
            : libraryCopy.cardList.emptyDefaultDescription
      }
      onActionPress={
        mode === "manage"
          ? hasContextFilter
            ? handleResetAllFilters
            : hasLocalFilters
              ? handleResetLocalFilters
              : undefined
          : undefined
      }
      title={libraryCopy.cardList.emptyTitle}
    />
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={capabilities.showResetAll && hasContextFilter ? handleResetAllFilters : undefined}
        rightLabel={capabilities.showResetAll && hasContextFilter ? libraryCopy.cardList.showAllCards : undefined}
        subtitle={screenSubtitle}
        title={screenTitle}
      />

      <CardListView
        items={cards}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        onPressItem={(card) =>
          navigation.navigate(
            "CardDetail",
            mode === "source_related" ? buildReadonlyCardDetailParams(card.id) : { cardId: card.id },
          )
        }
        onRefresh={() => cardsQuery.refetch()}
        refreshing={cardsQuery.isRefetching}
      />
    </SafeAreaView>
  );
}
