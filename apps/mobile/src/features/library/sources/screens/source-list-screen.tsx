import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  type KnowledgeSource,
  type SourceStatus,
  type SourceType,
  useInfiniteSourcesQuery,
} from "@/features/library/api";
import { FilterChipRow, type FilterChipItem } from "@/features/library/shared/components/filter-chip-row";
import { SessionImportHintModal } from "@/features/library/sources/components/session-import-hint-modal";
import { SourceImportSheet } from "@/features/library/sources/components/source-import-sheet";
import { SourceListItem } from "@/features/library/sources/components/source-list-item";
import { sourceListScreenStyles as styles } from "@/features/library/sources/screens/source-list-screen.styles";
import { libraryCopy } from "@/features/library/utils/library-copy";
import { getStableArray } from "@/features/library/utils/library-state";
import { pickSourceDocument } from "@/features/library/utils/source-document-picker";
import { flattenInfiniteItems } from "@/lib/query/infinite-query";
import { type RootStackParamList } from "@/navigation/types";

const footerContainerStyle = { alignItems: "center", paddingBottom: 24, paddingTop: 8 } as const;
const footerHintTextStyle = { color: "#64748B" } as const;
const footerHintSpacingStyle = { color: "#64748B", marginTop: 8 } as const;

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
  { key: "document", label: "文件" },
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
  const [isImportSheetVisible, setIsImportSheetVisible] = useState(false);
  const [isSessionHintVisible, setIsSessionHintVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SourceStatusFilterKey>(route.params?.status ?? "all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilterKey>(route.params?.sourceType ?? "all");

  const sourcesQuery = useInfiniteSourcesQuery({
    sourceType: toSourceTypeValue(sourceTypeFilter),
    status: toSourceStatusValue(statusFilter),
  });
  const sources = getStableArray(flattenInfiniteItems(sourcesQuery.data));
  const hasFilters = statusFilter !== "all" || sourceTypeFilter !== "all";

  function openImportSheet() {
    setIsImportSheetVisible(true);
  }

  function closeImportSheet() {
    setIsImportSheetVisible(false);
  }

  function openSessionHint() {
    setIsSessionHintVisible(true);
  }

  function closeSessionHint() {
    setIsSessionHintVisible(false);
  }

  function handleResetFilters() {
    setStatusFilter("all");
    setSourceTypeFilter("all");
  }

  async function handleImportFile() {
    closeImportSheet();

    try {
      const file = await pickSourceDocument();

      if (!file) {
        return;
      }

      navigation.navigate("CreateSourceDocument", {
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        fileUri: file.fileUri,
      });
    } catch (error) {
      Alert.alert(
        "文件选择失败",
        error instanceof Error ? error.message : "暂时无法读取这个文件，请稍后再试。",
      );
    }
  }

  function handleImportFilePress() {
    handleImportFile().catch(() => {});
  }

  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>来源总览</Text>
          {sourcesQuery.data?.pages[0]?.pagination ? (
            <Text style={styles.resultMeta}>共 {sourcesQuery.data.pages[0].pagination.total} 条来源</Text>
          ) : null}
        </View>

        <PrimaryButton
          iconName="cloud-upload-outline"
          label={libraryCopy.sourceList.importContentAction}
          onPress={openImportSheet}
          style={styles.importButton}
        />

        <View style={styles.filterCard}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>状态</Text>
            <FilterChipRow items={sourceStatusItems} onSelect={setStatusFilter} selectedKey={statusFilter} />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>类型</Text>
            <FilterChipRow items={sourceTypeItems} onSelect={setSourceTypeFilter} selectedKey={sourceTypeFilter} />
          </View>

          {hasFilters ? (
            <PrimaryButton
              label={libraryCopy.cardList.clearLocalFilters}
              onPress={handleResetFilters}
              variant="secondary"
            />
          ) : null}
        </View>
      </View>
    ),
    [hasFilters, sourceTypeFilter, sourcesQuery.data?.pages, statusFilter],
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
          description={sourcesQuery.error instanceof Error ? sourcesQuery.error.message : libraryCopy.loadFailed}
          onRetry={() => sourcesQuery.refetch()}
          retryLabel={libraryCopy.retry}
          title={libraryCopy.sourceList.errorTitle}
        />
      );
    }

    return (
      <EmptyState
        actionLabel={hasFilters ? libraryCopy.cardList.clearLocalFilters : libraryCopy.sourceList.importContentAction}
        description={
          hasFilters
            ? libraryCopy.sourceList.emptyFilteredDescription
            : libraryCopy.sourceList.emptyDefaultDescription
        }
        onActionPress={hasFilters ? handleResetFilters : openImportSheet}
        title={libraryCopy.sourceList.emptyTitle}
      />
    );
  }, [hasFilters, sourcesQuery]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} subtitle="资料来源" title="知识来源" />

      <FlatList<KnowledgeSource>
        contentContainerStyle={styles.content}
        data={sources}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={
          sources.length > 0 ? (
            <View style={footerContainerStyle}>
              {sourcesQuery.isFetchingNextPage ? (
                <>
                  <ActivityIndicator />
                  <Text style={footerHintSpacingStyle}>正在加载更多…</Text>
                </>
              ) : !sourcesQuery.hasNextPage ? (
                <Text style={footerHintTextStyle}>没有更多内容了</Text>
              ) : null}
            </View>
          ) : null
        }
        ListHeaderComponent={listHeaderComponent}
        onEndReached={() => {
          if (sourcesQuery.hasNextPage && !sourcesQuery.isFetchingNextPage) {
            sourcesQuery.fetchNextPage().catch(() => {});
          }
        }}
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

      <SourceImportSheet
        onClose={closeImportSheet}
        onImportFile={handleImportFilePress}
        onImportSession={() => {
          closeImportSheet();
          openSessionHint();
        }}
        onImportText={() => {
          closeImportSheet();
          navigation.navigate("CreateSourceText");
        }}
        visible={isImportSheetVisible}
      />

      <SessionImportHintModal
        onClose={closeSessionHint}
        onGoToSessions={() => {
          closeSessionHint();
          navigation.navigate("MainTabs", {
            screen: "SessionsHome",
          });
        }}
        visible={isSessionHintVisible}
      />
    </SafeAreaView>
  );
}
