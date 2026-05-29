import { Alert } from "react-native";
import { useEffect, useMemo, useState } from "react";

import {
  createSourceCardsMutationContext,
  useConfirmCardsMutation,
  useDeleteSourceMutation,
  type KnowledgeCard,
  type KnowledgeSource,
} from "@/features/library/api";
import { retainExistingIds } from "@/features/library/utils/library-state";

type UseSourceDetailControllerArgs = {
  sourceId: string;
  source: KnowledgeSource | undefined;
  cards: KnowledgeCard[];
  pendingCards: KnowledgeCard[];
  onDeleted: () => void;
};

export function useSourceDetailController({ sourceId, source, cards, pendingCards, onDeleted }: UseSourceDetailControllerArgs) {
  const confirmCardsMutation = useConfirmCardsMutation();
  const deleteSourceMutation = useDeleteSourceMutation();
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

  useEffect(() => {
    const pendingIdSet = new Set(pendingCards.map((card) => card.id));
    setSelectedPendingIds((current) => retainExistingIds(current, pendingIdSet));
  }, [pendingCards]);

  const selectedPendingSet = useMemo(() => new Set(selectedPendingIds), [selectedPendingIds]);

  function togglePendingCard(cardId: string) {
    setSelectedPendingIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  }

  function selectAllPending() {
    setSelectedPendingIds(pendingCards.map((card) => card.id));
  }

  function clearPendingSelection() {
    setSelectedPendingIds([]);
  }

  async function confirmSelectedPendingCards() {
    if (selectedPendingIds.length === 0 || confirmCardsMutation.isPending) {
      return;
    }

    try {
      const confirmedCount = selectedPendingIds.length;
      await confirmCardsMutation.mutateAsync({
        cardIds: selectedPendingIds,
        context: createSourceCardsMutationContext(sourceId),
      });
      setSelectedPendingIds([]);
      Alert.alert("确认完成", `已确认 ${confirmedCount} 张卡片。`);
    } catch (error) {
      Alert.alert("确认失败", error instanceof Error ? error.message : "暂时无法确认这些卡片，请稍后再试。");
    }
  }

  function deleteSource(deleteCards: boolean) {
    if (!source || deleteSourceMutation.isPending) {
      return;
    }

    const linkedCount = cards.length;
    const actionText = deleteCards ? "删除来源与卡片" : "只删除来源";
    const description = deleteCards
      ? `删除后会同时移除这条来源及其关联的 ${linkedCount} 张卡片。`
      : linkedCount > 0
        ? `删除后会移除这条来源，但会保留已生成的 ${linkedCount} 张卡片。`
        : "删除后会移除这条来源记录。";

    Alert.alert("删除知识来源", description, [
      { text: "取消", style: "cancel" },
      {
        text: actionText,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSourceMutation.mutateAsync({ sourceId, deleteCards });
            onDeleted();
          } catch (error) {
            Alert.alert("删除失败", error instanceof Error ? error.message : "暂时无法删除这条来源，请稍后再试。");
          }
        },
      },
    ]);
  }

  return {
    clearPendingSelection,
    confirmCardsMutation,
    confirmSelectedPendingCards,
    deleteSource,
    deleteSourceMutation,
    selectAllPending,
    selectedPendingIds,
    selectedPendingSet,
    togglePendingCard,
  };
}
