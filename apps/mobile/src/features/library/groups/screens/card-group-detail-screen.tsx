import { useMemo } from "react";
import { View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  createGroupCardsMutationContext,
  useGroupCardsQuery,
  useGroupDetailQuery,
} from "@/features/library/api";
import {
  CardGroupActionsSection,
  CardGroupDetailOverviewSection,
  CardGroupSettingsSection,
} from "@/features/library/groups/components/card-group-detail-sections";
import { useCardGroupDetailController } from "@/features/library/groups/hooks/use-card-group-detail-controller";
import { cardGroupDetailScreenStyles as styles } from "@/features/library/groups/screens/card-group-detail-screen.styles";
import { CardListView } from "@/features/library/shared/components/card-list-view";
import { SelectionFooter } from "@/features/library/shared/components/selection-footer";
import { type RootStackParamList } from "@/navigation/types";

export function CardGroupDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "CardGroupDetail">) {
  const groupQuery = useGroupDetailQuery(route.params.groupId);
  const groupCardsQuery = useGroupCardsQuery(route.params.groupId);

  const group = groupQuery.data;
  const cards = groupCardsQuery.data?.items ?? [];

  const controller = useCardGroupDetailController({
    cards,
    group,
    groupId: route.params.groupId,
    onDeleted: () => navigation.replace("CardGroupList"),
    onGroupNameChange: (name) => navigation.setParams({ groupName: name }),
    routeGroupName: route.params.groupName,
  });

  const listHeaderComponent = group ? (
    <View style={styles.headerContent}>
      <CardGroupDetailOverviewSection group={group} />
      <CardGroupActionsSection
        cardCount={cards.length}
        isSelectionMode={controller.isSelectionMode}
        onAddCards={() =>
          navigation.navigate("GroupCardPicker", {
            existingCardIds: controller.existingCardIds,
            groupId: route.params.groupId,
            groupName: group.name,
          })
        }
        onOpenFilteredCards={() =>
          navigation.navigate("CardList", {
            groupId: route.params.groupId,
            groupName: group.name,
          })
        }
        onToggleSelectionMode={() => {
          if (controller.isSelectionMode) {
            controller.exitSelectionMode();
            return;
          }

          controller.setIsSelectionMode(true);
        }}
      />
    </View>
  ) : null;

  const listFooterComponent = group ? (
    <CardGroupSettingsSection
      currentName={group.name}
      isDeleting={controller.deleteGroupMutation.isPending}
      isRenaming={controller.renameGroupMutation.isPending}
      nameDraft={controller.nameDraft}
      onChangeName={controller.setNameDraft}
      onDelete={controller.deleteGroup}
      onRename={controller.renameGroup}
    />
  ) : null;

  const listEmptyComponent = useMemo(() => {
    if (groupQuery.isLoading || groupCardsQuery.isLoading) {
      return <EmptyState description="请稍候，我们正在同步分组详情与卡片内容。" title="正在加载分组" />;
    }

    if (groupQuery.isError || groupCardsQuery.isError) {
      const error =
        groupQuery.error instanceof Error
          ? groupQuery.error.message
          : groupCardsQuery.error instanceof Error
            ? groupCardsQuery.error.message
            : "暂时无法读取当前分组，请稍后再试。";

      return (
        <ErrorState
          description={error}
          onRetry={() => {
            groupQuery.refetch();
            groupCardsQuery.refetch();
          }}
          retryLabel="重新加载"
          title="分组加载失败"
        />
      );
    }

    return (
      <EmptyState
        actionLabel="添加第一张卡片"
        description="这个分组里还没有卡片。"
        onActionPress={() =>
          navigation.navigate("GroupCardPicker", {
            existingCardIds: controller.existingCardIds,
            groupId: route.params.groupId,
            groupName: group?.name ?? route.params.groupName,
          })
        }
        title="暂无卡片"
      />
    );
  }, [controller.existingCardIds, group?.name, groupCardsQuery, groupQuery, navigation, route.params.groupId, route.params.groupName]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={() =>
          navigation.navigate("GroupCardPicker", {
            existingCardIds: controller.existingCardIds,
            groupId: route.params.groupId,
            groupName: group?.name ?? route.params.groupName,
          })
        }
        rightLabel="添加卡片"
        subtitle="分组详情"
        title={group?.name ?? route.params.groupName ?? "卡片分组详情"}
      />

      <View style={styles.body}>
        <CardListView
          isItemSelectable={() => controller.isSelectionMode}
          items={cards}
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={listFooterComponent}
          ListHeaderComponent={listHeaderComponent}
          mode={controller.isSelectionMode ? "selectable" : "embedded"}
          onPressItem={(card) =>
            navigation.navigate("CardDetail", {
              cardId: card.id,
              cardMutationContext: createGroupCardsMutationContext(route.params.groupId),
            })
          }
          onRefresh={() => {
            groupQuery.refetch();
            groupCardsQuery.refetch();
          }}
          onToggleSelect={(card) => controller.toggleSelect(card.id)}
          refreshing={groupQuery.isRefetching || groupCardsQuery.isRefetching}
          selectedIds={controller.selectedIdSet}
        />

        {controller.isSelectionMode ? (
          <SelectionFooter
            confirmDisabled={controller.selectedCardIds.length === 0 || controller.removeCardsMutation.isPending}
            confirmLabel={controller.removeCardsMutation.isPending ? "移除中…" : `移除选中 (${controller.selectedCardIds.length})`}
            onConfirm={controller.removeSelectedCards}
            onSecondaryPress={controller.exitSelectionMode}
            secondaryLabel="取消"
            selectedCount={controller.selectedCardIds.length}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
