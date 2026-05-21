import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "../../../components/ui/screen-header";
import { type RootStackParamList } from "../../../navigation/types";
import { type KnowledgeSource, type SourceStatus, type SourceType, useSourcesQuery } from "../api";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { FilterChipRow, type FilterChipItem } from "../components/filter-chip-row";
import { SourceListItem } from "../components/source-list-item";
import { libraryCopy } from "../utils/library-copy";
import { getStableArray } from "../utils/library-state";
import { sourceListScreenStyles as styles } from "./source-list-screen.styles";

type SourceStatusFilterKey = "all" | SourceStatus;
type SourceTypeFilterKey = "all" | SourceType;

const sourceStatusItems: ReadonlyArray<FilterChipItem<SourceStatusFilterKey>> = [
  { key: "all", label: "全部状态" },
  { key: "processing", label: "处理中" },
  { key: "ready", label: "已完成" },
  { key: "failed", label: "失败" },
];

const sourceTypeItems: ReadonlyArray<FilterChipItem<SourceTypeFilterKey>> = [
  { key: "all", label: "全部类型" },
  { key: "manual_text", label: "文本" },
  { key: "document", label: "文档" },
  { key: "messages", label: "消息" },
];

function toSourceStatusValue(filterKey: SourceStatusFilterKey): SourceStatus | undefined {
  return filterKey === "all" ? undefined : filterKey;
}

function toSourceTypeValue(filterKey: SourceTypeFilterKey): SourceType | undefined {
  return filterKey === "all" ? undefined : filterKey;
}

export function SourceListScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "SourceList">) {
  const [statusFilter, setStatusFilter] = useState<SourceStatusFilterKey>(
    route.params?.status ?? "all",
  );
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilterKey>(
    route.params?.sourceType ?? "all",
  );

  const sourcesQuery = useSourcesQuery({
    status: toSourceStatusValue(statusFilter),
    sourceType: toSourceTypeValue(sourceTypeFilter),
  });
  const sources = getStableArray(sourcesQuery.data?.items);
  const hasFilters = statusFilter !== "all" || sourceTypeFilter !== "all";

  function handleResetFilters() {
    setStatusFilter("all");
    setSourceTypeFilter("all");
  }

  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>全部知识来源</Text>
          <Text style={styles.heroText}>查看不同资料的整理结果，并继续处理生成的卡片。</Text>
          {sourcesQuery.data?.pagination ? (
            <Text style={styles.resultMeta}>
              共 {sourcesQuery.data.pagination.total} 条来源
            </Text>
          ) : null}
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>状态</Text>
            <FilterChipRow
              items={sourceStatusItems}
              onSelect={setStatusFilter}
              selectedKey={statusFilter}
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>类型</Text>
            <FilterChipRow
              items={sourceTypeItems}
              onSelect={setSourceTypeFilter}
              selectedKey={sourceTypeFilter}
            />
          </View>
        </View>
      </View>
    ),
    [sourcesQuery.data?.pagination, statusFilter, sourceTypeFilter],
  );

  const listEmptyComponent = useMemo(() => {
    if (sourcesQuery.isLoading) {
      return (
        <EmptyState
          description={libraryCopy.sourceList.loadingDescription}
          title={libraryCopy.sourceList.loadingTitle}
        />
      );
    }

    if (sourcesQuery.isError) {
      return (
        <ErrorState
          description={
            sourcesQuery.error instanceof Error ? sourcesQuery.error.message : libraryCopy.loadFailed
          }
          onRetry={() => sourcesQuery.refetch()}
          retryLabel={libraryCopy.retry}
          title={libraryCopy.sourceList.errorTitle}
        />
      );
    }

    return (
      <EmptyState
        actionLabel={hasFilters ? libraryCopy.cardList.clearLocalFilters : libraryCopy.sourceList.importTextAction}
        description={
          hasFilters
            ? libraryCopy.sourceList.emptyFilteredDescription
            : libraryCopy.sourceList.emptyDefaultDescription
        }
        onActionPress={hasFilters ? handleResetFilters : () => navigation.navigate("CreateSourceText")}
        title={libraryCopy.sourceList.emptyTitle}
      />
    );
  }, [hasFilters, navigation, sourcesQuery]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={() => navigation.navigate("CreateSourceText")}
        rightLabel={libraryCopy.sourceList.importTextAction}
        subtitle="资料来源"
        title="知识来源"
      />

      <FlatList<KnowledgeSource>
        contentContainerStyle={styles.content}
        data={sources}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        onRefresh={() => sourcesQuery.refetch()}
        refreshing={sourcesQuery.isRefetching}
        renderItem={({ item }) => (
          <SourceListItem
            onPress={() =>
              navigation.navigate("SourceDetail", {
                sourceId: item.id,
                sourceName: item.name,
              })
            }
            source={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
