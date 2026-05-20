import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type LibraryStackParamList } from "../../../navigation/types";
import {
  useDeleteGroupMutation,
  useGroupCardsQuery,
  useGroupDetailQuery,
  useRemoveCardsFromGroupMutation,
  useRenameGroupMutation,
} from "../api";
import { CardListView } from "../components/card-list-view";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { SelectionFooter } from "../components/selection-footer";
import { formatDateTimeLabel } from "../utils/library-formatters";
import { getStableArray, retainExistingIds } from "../utils/library-state";
import { cardGroupDetailScreenStyles as styles } from "./card-group-detail-screen.styles";

export function CardGroupDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<LibraryStackParamList, "CardGroupDetail">) {
  const groupQuery = useGroupDetailQuery(route.params.groupId);
  const groupCardsQuery = useGroupCardsQuery(route.params.groupId);
  const renameGroupMutation = useRenameGroupMutation();
  const deleteGroupMutation = useDeleteGroupMutation();
  const removeCardsMutation = useRemoveCardsFromGroupMutation();

  const [nameDraft, setNameDraft] = useState(route.params.groupName ?? "");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const group = groupQuery.data;
  const cards = getStableArray(groupCardsQuery.data?.items);
  const selectedIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const existingCardIds = useMemo(() => cards.map((card) => card.id), [cards]);

  useEffect(() => {
    if (group?.name) {
      setNameDraft((current) => (current === group.name ? current : group.name));

      if (route.params.groupName !== group.name) {
        navigation.setParams({ groupName: group.name });
      }
    }
  }, [group?.name, navigation, route.params.groupName]);

  useEffect(() => {
    const cardIdSet = new Set(cards.map((card) => card.id));
    setSelectedCardIds((current) => retainExistingIds(current, cardIdSet));
  }, [cards]);

  function handleToggleSelect(cardId: string) {
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  function exitSelectionMode() {
    setIsSelectionMode(false);
    setSelectedCardIds([]);
  }

  async function handleRenameGroup() {
    const nextName = nameDraft.trim();

    if (!group || !nextName || nextName === group.name || renameGroupMutation.isPending) {
      return;
    }

    try {
      const renamed = await renameGroupMutation.mutateAsync({
        groupId: route.params.groupId,
        name: nextName,
      });
      setNameDraft(renamed.name);
      navigation.setParams({ groupName: renamed.name });
    } catch (error) {
      Alert.alert(
        "重命名失败",
        error instanceof Error ? error.message : "暂时无法修改分组名称，请稍后再试。",
      );
    }
  }

  async function handleRemoveSelectedCards() {
    if (selectedCardIds.length === 0 || removeCardsMutation.isPending) {
      return;
    }

    try {
      const removedCount = selectedCardIds.length;
      await removeCardsMutation.mutateAsync({
        groupId: route.params.groupId,
        cardIds: selectedCardIds,
      });
      exitSelectionMode();
      Alert.alert("移除完成", `已从当前分组中移除 ${removedCount} 张卡片。`);
    } catch (error) {
      Alert.alert(
        "移除失败",
        error instanceof Error ? error.message : "暂时无法移除这些卡片，请稍后再试。",
      );
    }
  }

  function handleDeleteGroup() {
    if (!group || deleteGroupMutation.isPending) {
      return;
    }

    Alert.alert(
      "删除分组",
      cards.length > 0
        ? `删除后会移除这个分组本身，但不会删除其中的 ${cards.length} 张卡片。`
        : "删除后会移除这个空分组。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认删除",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGroupMutation.mutateAsync(route.params.groupId);
              navigation.replace("CardGroupList");
            } catch (error) {
              Alert.alert(
                "删除失败",
                error instanceof Error ? error.message : "暂时无法删除这个分组，请稍后再试。",
              );
            }
          },
        },
      ],
    );
  }

  const listHeaderComponent = useMemo(() => {
    if (!group) {
      return null;
    }

    return (
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{group.name}</Text>
          <Text style={styles.heroText}>
            这个分组下已经组织了 {cards.length} 张卡片。你可以继续向分组中添加卡片、批量移除卡片，或修改分组名称。
          </Text>
          <Text style={styles.heroMeta}>最近更新 {formatDateTimeLabel(group.updatedAt)}</Text>
        </View>

        <View style={styles.manageCard}>
          <Text style={styles.manageTitle}>分组设置</Text>
          <Field
            label="分组名称"
            onChangeText={setNameDraft}
            placeholder="输入新的分组名称"
            value={nameDraft}
          />
          <PrimaryButton
            disabled={
              !nameDraft.trim() ||
              nameDraft.trim() === group.name ||
              renameGroupMutation.isPending
            }
            label={renameGroupMutation.isPending ? "保存中..." : "保存名称"}
            onPress={handleRenameGroup}
          />
          <PrimaryButton
            label={deleteGroupMutation.isPending ? "删除中..." : "删除分组"}
            onPress={handleDeleteGroup}
            variant="secondary"
          />
        </View>

        <View style={styles.actionsCard}>
          <PrimaryButton
            label="添加卡片"
            onPress={() =>
              navigation.navigate("GroupCardPicker", {
                groupId: route.params.groupId,
                groupName: group.name,
                existingCardIds,
              })
            }
          />
          <PrimaryButton
            label="按本组筛选"
            onPress={() =>
              navigation.navigate("CardList", {
                groupId: route.params.groupId,
                groupName: group.name,
              })
            }
            variant="secondary"
          />
          <PrimaryButton
            label={isSelectionMode ? "取消移除" : "批量移除"}
            onPress={isSelectionMode ? exitSelectionMode : () => setIsSelectionMode(true)}
            variant="secondary"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>组内卡片</Text>
          <Text style={styles.sectionCaption}>共 {cards.length} 张</Text>
        </View>

        {isSelectionMode ? (
          <View style={styles.selectionHintCard}>
            <Text style={styles.selectionHintTitle}>正在选择要移除的卡片</Text>
            <Text style={styles.selectionHintText}>
              点按组内卡片可以加入或取消选择，确认后只会把卡片移出当前分组，不会删除卡片本身。
            </Text>
          </View>
        ) : null}
      </View>
    );
  }, [
    cards.length,
    deleteGroupMutation.isPending,
    existingCardIds,
    group,
    isSelectionMode,
    nameDraft,
    navigation,
    renameGroupMutation.isPending,
    route.params.groupId,
  ]);

  const listEmptyComponent = useMemo(() => {
    if (groupQuery.isLoading || groupCardsQuery.isLoading) {
      return (
        <EmptyState
          description="正在读取分组详情和组内卡片，请稍等片刻。"
          title="正在加载分组详情"
        />
      );
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
          title="分组详情加载失败"
        />
      );
    }

    return (
      <EmptyState
        actionLabel="添加第一张卡片"
        description="这个分组里还没有卡片，可以先去全量卡片池里挑选相关卡片加入进来。"
        onActionPress={() =>
          navigation.navigate("GroupCardPicker", {
            groupId: route.params.groupId,
            groupName: group?.name ?? route.params.groupName,
            existingCardIds,
          })
        }
        title="这个分组还是空的"
      />
    );
  }, [
    existingCardIds,
    group?.name,
    groupCardsQuery,
    groupQuery,
    navigation,
    route.params.groupId,
    route.params.groupName,
  ]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={() =>
          navigation.navigate("GroupCardPicker", {
            groupId: route.params.groupId,
            groupName: group?.name ?? route.params.groupName,
            existingCardIds,
          })
        }
        rightLabel="添加卡片"
        subtitle="分组详情"
        title={group?.name ?? route.params.groupName ?? "卡片分组详情"}
      />

      <View style={styles.body}>
        <CardListView
          isItemSelectable={() => isSelectionMode}
          items={cards}
          ListEmptyComponent={listEmptyComponent}
          ListHeaderComponent={listHeaderComponent}
          mode={isSelectionMode ? "selectable" : "embedded"}
          onPressItem={(card) => navigation.navigate("CardDetail", { cardId: card.id })}
          onRefresh={() => {
            groupQuery.refetch();
            groupCardsQuery.refetch();
          }}
          onToggleSelect={(card) => handleToggleSelect(card.id)}
          refreshing={groupQuery.isRefetching || groupCardsQuery.isRefetching}
          selectedIds={selectedIdSet}
        />

        {isSelectionMode ? (
          <SelectionFooter
            confirmDisabled={selectedCardIds.length === 0 || removeCardsMutation.isPending}
            confirmLabel={
              removeCardsMutation.isPending
                ? "移除中..."
                : `移除选中 (${selectedCardIds.length})`
            }
            onConfirm={handleRemoveSelectedCards}
            onSecondaryPress={exitSelectionMode}
            secondaryLabel="取消"
            selectedCount={selectedCardIds.length}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
