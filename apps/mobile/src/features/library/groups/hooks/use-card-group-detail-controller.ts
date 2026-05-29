import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  useDeleteGroupMutation,
  useRemoveCardsFromGroupMutation,
  useRenameGroupMutation,
  type CardGroup,
  type KnowledgeCard,
} from "@/features/library/api";
import { retainExistingIds } from "@/features/library/utils/library-state";

type UseCardGroupDetailControllerArgs = {
  groupId: string;
  routeGroupName?: string;
  group: CardGroup | undefined;
  cards: KnowledgeCard[];
  onGroupNameChange: (name: string) => void;
  onDeleted: () => void;
};

export function useCardGroupDetailController({
  groupId,
  routeGroupName,
  group,
  cards,
  onGroupNameChange,
  onDeleted,
}: UseCardGroupDetailControllerArgs) {
  const renameGroupMutation = useRenameGroupMutation();
  const deleteGroupMutation = useDeleteGroupMutation();
  const removeCardsMutation = useRemoveCardsFromGroupMutation();

  const [nameDraft, setNameDraft] = useState(routeGroupName ?? "");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const existingCardIds = useMemo(() => cards.map((card) => card.id), [cards]);
  const selectedIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);

  useEffect(() => {
    if (group?.name) {
      setNameDraft((current) => (current === group.name ? current : group.name));

      if (routeGroupName !== group.name) {
        onGroupNameChange(group.name);
      }
    }
  }, [group?.name, onGroupNameChange, routeGroupName]);

  useEffect(() => {
    const cardIdSet = new Set(cards.map((card) => card.id));
    setSelectedCardIds((current) => retainExistingIds(current, cardIdSet));
  }, [cards]);

  function toggleSelect(cardId: string) {
    setSelectedCardIds((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  function exitSelectionMode() {
    setIsSelectionMode(false);
    setSelectedCardIds([]);
  }

  async function renameGroup() {
    const nextName = nameDraft.trim();

    if (!group || !nextName || nextName === group.name || renameGroupMutation.isPending) {
      return;
    }

    try {
      const renamed = await renameGroupMutation.mutateAsync({
        groupId,
        name: nextName,
      });
      setNameDraft(renamed.name);
      onGroupNameChange(renamed.name);
    } catch (error) {
      Alert.alert("重命名失败", error instanceof Error ? error.message : "暂时无法修改分组名称，请稍后再试。");
    }
  }

  async function removeSelectedCards() {
    if (selectedCardIds.length === 0 || removeCardsMutation.isPending) {
      return;
    }

    try {
      const removedCount = selectedCardIds.length;
      await removeCardsMutation.mutateAsync({
        groupId,
        cardIds: selectedCardIds,
      });
      exitSelectionMode();
      Alert.alert("移除完成", `已从当前分组中移除 ${removedCount} 张卡片。`);
    } catch (error) {
      Alert.alert("移除失败", error instanceof Error ? error.message : "暂时无法移除这些卡片，请稍后再试。");
    }
  }

  function deleteGroup() {
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
              await deleteGroupMutation.mutateAsync(groupId);
              onDeleted();
            } catch (error) {
              Alert.alert("删除失败", error instanceof Error ? error.message : "暂时无法删除这个分组，请稍后再试。");
            }
          },
        },
      ],
    );
  }

  return {
    deleteGroup,
    deleteGroupMutation,
    existingCardIds,
    exitSelectionMode,
    isSelectionMode,
    nameDraft,
    removeCardsMutation,
    removeSelectedCards,
    renameGroup,
    renameGroupMutation,
    selectedCardIds,
    selectedIdSet,
    setIsSelectionMode,
    setNameDraft,
    toggleSelect,
  };
}
