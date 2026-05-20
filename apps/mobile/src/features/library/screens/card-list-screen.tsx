import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type LibraryStackParamList } from "../../../navigation/types";
import { type CardStatus, useCardsQuery } from "../api";
import { CardListView } from "../components/card-list-view";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { FilterChipRow, type FilterChipItem } from "../components/filter-chip-row";
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
}: NativeStackScreenProps<LibraryStackParamList, "CardList">) {
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
            这里是知识区的主检索入口。后续无论从分组还是来源进入，最终都可以回到这里继续筛选。
          </Text>
          {route.params?.sourceName ? (
            <Text style={styles.contextText}>当前来源：{route.params.sourceName}</Text>
          ) : null}
          {route.params?.groupName ? (
            <Text style={styles.contextText}>当前分组：{route.params.groupName}</Text>
          ) : null}
          {cardsQuery.data?.pagination ? (
            <Text style={styles.resultMeta}>
              当前结果 {cards.length} 条，共 {cardsQuery.data.pagination.total} 条
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
              label="清空本页筛选"
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
          description="正在从服务端读取卡片列表，请稍等片刻。"
          title="正在加载卡片"
        />
      );
    }

    if (cardsQuery.isError) {
      return (
        <ErrorState
          description={
            cardsQuery.error instanceof Error
              ? cardsQuery.error.message
              : "暂时无法读取卡片列表，请稍后再试。"
          }
          onRetry={() => cardsQuery.refetch()}
          retryLabel="重新加载"
          title="卡片列表加载失败"
        />
      );
    }

    return (
      <EmptyState
        actionLabel={hasContextFilter ? "查看全部卡片" : hasLocalFilters ? "清空筛选条件" : undefined}
        description={
          hasContextFilter || hasLocalFilters
            ? "当前筛选条件下还没有找到匹配的卡片，可以放宽条件后再试。"
            : "现在还没有可浏览的卡片，后续可以先从知识来源导入文本或等待卡片生成完成。"
        }
        onActionPress={
          hasContextFilter ? handleResetAllFilters : hasLocalFilters ? handleResetLocalFilters : undefined
        }
        title="暂时没有卡片"
      />
    );
  }, [cardsQuery, hasContextFilter, hasLocalFilters]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={hasContextFilter ? handleResetAllFilters : undefined}
        rightLabel={hasContextFilter ? "全部卡片" : undefined}
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
