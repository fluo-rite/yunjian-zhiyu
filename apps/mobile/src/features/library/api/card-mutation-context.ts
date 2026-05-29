import {
  normalizeCardListFilters,
  type CardListFilters,
} from "@/features/library/api/card-query-filters";

export type CardMutationContext =
  | { kind: "all_cards_list"; filters: ReturnType<typeof normalizeCardListFilters> }
  | { kind: "source_cards"; sourceId: string }
  | { kind: "group_cards"; groupId: string }
  | { kind: "card_detail_only" };

export const cardDetailOnlyMutationContext: CardMutationContext = {
  kind: "card_detail_only",
};

export function createAllCardsListMutationContext(
  filters?: CardListFilters,
): CardMutationContext {
  return {
    kind: "all_cards_list",
    filters: normalizeCardListFilters(filters),
  };
}

export function createSourceCardsMutationContext(
  sourceId: string,
): CardMutationContext {
  return {
    kind: "source_cards",
    sourceId,
  };
}

export function createGroupCardsMutationContext(
  groupId: string,
): CardMutationContext {
  return {
    kind: "group_cards",
    groupId,
  };
}
