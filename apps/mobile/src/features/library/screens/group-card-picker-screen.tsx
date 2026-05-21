import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type RootStackParamList } from "../../../navigation/types";
import { type CardStatus, useAddCardsToGroupMutation, useCardsQuery } from "../api";
import { CardListView } from "../components/card-list-view";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { FilterChipRow, type FilterChipItem } from "../components/filter-chip-row";
import { SelectionFooter } from "../components/selection-footer";
import { getStableArray, retainExistingIds } from "../utils/library-state";
import { groupCardPickerScreenStyles as styles } from "./group-card-picker-screen.styles";

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

export function GroupCardPickerScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "GroupCardPicker">) {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const cardsQuery = useCardsQuery({
    status: toStatusFilterValue(statusFilter),
    keyword: searchInput.trim() || undefined,
  });
  const addCardsMutation = useAddCardsToGroupMutation();

  const allCards = getStableArray(cardsQuery.data?.items);
  const existingCardIds = route.params.existingCardIds ?? [];
  const existingCardIdSet = useMemo(() => new Set(existingCardIds), [existingCardIds]);
  const availableCards = useMemo(
    () => allCards.filter((card) => !existingCardIdSet.has(card.id)),
    [allCards, existingCardIdSet],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hiddenExistingCount = allCards.length - availableCards.length;

  useEffect(() => {
    const availableIdSet = new Set(availableCards.map((card) => card.id));
    setSelectedIds((current) => retainExistingIds(current, availableIdSet));
  }, [availableCards]);

  function handleToggleSelect(cardId: string) {
    setSelectedIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  function handleClearSelection() {
    setSelectedIds([]);
  }

  async function handleConfirm() {
    if (selectedIds.length === 0 || addCardsMutation.isPending) {
      return;
    }

    try {
      const addedCount = selectedIds.length;
      await addCardsMutation.mutateAsync({
        groupId: route.params.groupId,
        cardIds: selectedIds,
      });
      Alert.alert("添加完成", `已将 ${addedCount} 张卡片加入当前分组。`);
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "添加失败",
        error instanceof Error ? error.message : "暂时无法把这些卡片加入分组，请稍后再试。",
      );
    }
  }

  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{route.params.groupName ?? "添加卡片到分组"}</Text>
          <Text style={styles.heroText}>
            从全量卡片池中挑选需要的卡片加入当前分组。已经在分组中的卡片会自动从结果里隐藏。
          </Text>
          {cardsQuery.data?.pagination ? (
            <Text style={styles.resultMeta}>
              当前可加入 {availableCards.length} 张
              {hiddenExistingCount > 0 ? `，其中 ${hiddenExistingCount} 张已在分组中` : ""}
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
        </View>
      </View>
    ),
    [
      availableCards.length,
      cardsQuery.data?.pagination,
      hiddenExistingCount,
      route.params.groupName,
      searchInput,
      statusFilter,
    ],
  );

  const listEmptyComponent = useMemo(() => {
    if (cardsQuery.isLoading) {
      return (
        <EmptyState
          description="正在读取可添加的卡片列表，请稍等片刻。"
          title="正在加载可选卡片"
        />
      );
    }

    if (cardsQuery.isError) {
      return (
        <ErrorState
          description={
            cardsQuery.error instanceof Error
              ? cardsQuery.error.message
              : "暂时无法读取可选卡片，请稍后再试。"
          }
          onRetry={() => cardsQuery.refetch()}
          retryLabel="重新加载"
          title="可选卡片加载失败"
        />
      );
    }

    return (
      <EmptyState
        actionLabel={searchInput.trim() || statusFilter !== "all" ? "清空筛选条件" : undefined}
        description={
          searchInput.trim() || statusFilter !== "all"
            ? "当前筛选条件下没有可加入的卡片，可以放宽条件后再试。"
            : hiddenExistingCount > 0
              ? "当前能检索到的卡片都已经在这个分组里了，可以换个关键词继续找。"
              : "现在还没有可加入的卡片，先去知识来源里生成一些卡片再回来。"
        }
        onActionPress={() => {
          setSearchInput("");
          setStatusFilter("all");
        }}
        title="暂时没有可加入的卡片"
      />
    );
  }, [cardsQuery, hiddenExistingCount, searchInput, statusFilter]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle="多选加入"
        title={route.params.groupName ?? "添加卡片到分组"}
      />

      <View style={styles.body}>
        <CardListView
          items={availableCards}
          ListEmptyComponent={listEmptyComponent}
          ListHeaderComponent={listHeaderComponent}
          mode="selectable"
          onPressItem={(card) => navigation.navigate("CardDetail", { cardId: card.id })}
          onRefresh={() => cardsQuery.refetch()}
          onToggleSelect={(card) => handleToggleSelect(card.id)}
          refreshing={cardsQuery.isRefetching}
          selectedIds={selectedIdSet}
        />

        <SelectionFooter
          confirmDisabled={selectedIds.length === 0 || addCardsMutation.isPending}
          confirmLabel={addCardsMutation.isPending ? "添加中..." : `加入分组 (${selectedIds.length})`}
          onConfirm={handleConfirm}
          onSecondaryPress={handleClearSelection}
          secondaryLabel={selectedIds.length > 0 ? "清空选择" : undefined}
          selectedCount={selectedIds.length}
        />
      </View>
    </SafeAreaView>
  );
}
