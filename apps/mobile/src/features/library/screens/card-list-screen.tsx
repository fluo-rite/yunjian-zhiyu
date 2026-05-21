import { useMemo, useState } from "react";
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
  const [searchInput, setSearchInput] = useState(route.params?.keyword ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>(route.params?.status ?? "all");

  const cardsQuery = useCardsQuery({
    status: toStatusFilterValue(statusFilter),
    sourceId: route.params?.sourceId,
    groupId: route.params?.groupId,
    keyword: searchInput.trim() || undefined,
  });

  const cards = getStableArray(cardsQuery.data?.items);
  const hasContextFilter = Boolean(route.params?.sourceId || route.params?.groupId);
  const hasLocalFilters = Boolean(searchInput.trim() || statusFilter !== "all");
  const screenTitle = route.params?.sourceName
    ? `${route.params.sourceName} 的卡片`
    : route.params?.groupName
      ? `${route.params.groupName} 的卡片`
      : "知识卡片";
  const screenSubtitle = route.params?.sourceName
    ? "来源筛选"
    : route.params?.groupName
      ? "分组筛选"
      : "主浏览页";

  function handleResetLocalFilters() {
    setSearchInput("");
    setStatusFilter("all");
  }

  function handleResetAllFilters() {
    navigation.replace("CardList");
  }

  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>统一浏览全部知识卡片</Text>
          <Text style={styles.heroText}>
            这里是知识区的主检索入口。无论是从分组还是来源进入，最终都可以回到这里继续筛选。
          </Text>
          {route.params?.sourceName ? (
            <Text style={styles.contextText}>当前来源：{route.params.sourceName}</Text>
          ) : null}
          {route.params?.groupName ? (
            <Text style={styles.contextText}>当前分组：{route.params.groupName}</Text>
          ) : null}
          {cardsQuery.data?.pagination ? (
            <Text style={styles.resultMeta}>
              当前结果 {cards.length} 张，共 {cardsQuery.data.pagination.total} 张
            </Text>
          ) : null}
        </View>

        <View style={styles.filterCard}>
          <Field
            label="搜索卡片"
            onChangeText={setSearchInput}
            placeholder="输入标题、正文或标签关键词"
            value={searchInput}
          />

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>按状态筛选</Text>
            <FilterChipRow
              items={statusFilterItems}
              onSelect={setStatusFilter}
              selectedKey={statusFilter}
            />
          </View>

          {hasLocalFilters ? (
            <PrimaryButton
              label={libraryCopy.cardList.clearLocalFilters}
              onPress={handleResetLocalFilters}
              variant="secondary"
            />
          ) : null}
        </View>
      </View>
    ),
    [
      cards.length,
      cardsQuery.data?.pagination,
      hasLocalFilters,
      route.params?.groupName,
      route.params?.sourceName,
      searchInput,
      statusFilter,
    ],
  );

  const listEmptyComponent = useMemo(() => {
    if (cardsQuery.isLoading) {
      return (
        <EmptyState
          description={libraryCopy.cardList.loadingDescription}
          title={libraryCopy.cardList.loadingTitle}
        />
      );
    }

    if (cardsQuery.isError) {
      return (
        <ErrorState
          description={
            cardsQuery.error instanceof Error
              ? cardsQuery.error.message
              : libraryCopy.loadFailed
          }
          onRetry={() => cardsQuery.refetch()}
          retryLabel={libraryCopy.retry}
          title={libraryCopy.cardList.errorTitle}
        />
      );
    }

    return (
      <EmptyState
        actionLabel={
          hasContextFilter
            ? libraryCopy.cardList.showAllCards
            : hasLocalFilters
              ? libraryCopy.cardList.clearLocalFilters
              : undefined
        }
        description={
          hasContextFilter || hasLocalFilters
            ? libraryCopy.cardList.emptyFilteredDescription
            : libraryCopy.cardList.emptyDefaultDescription
        }
        onActionPress={
          hasContextFilter ? handleResetAllFilters : hasLocalFilters ? handleResetLocalFilters : undefined
        }
        title={libraryCopy.cardList.emptyTitle}
      />
    );
  }, [cardsQuery, hasContextFilter, hasLocalFilters]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={hasContextFilter ? handleResetAllFilters : undefined}
        rightLabel={hasContextFilter ? libraryCopy.cardList.showAllCards : undefined}
        subtitle={screenSubtitle}
        title={screenTitle}
      />

      <CardListView
        items={cards}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        onPressItem={(card) => navigation.navigate("CardDetail", { cardId: card.id })}
        onRefresh={() => cardsQuery.refetch()}
        refreshing={cardsQuery.isRefetching}
      />
    </SafeAreaView>
  );
}
