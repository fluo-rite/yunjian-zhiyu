import type { CardListFilters } from "@/features/library/api/card-query-filters";
import type { SourceListFilters } from "@/features/library/api/source-query-filters";

export const libraryQueryKeys = {
  all: ["library"] as const,
  cards: () => [...libraryQueryKeys.all, "cards"] as const,
  cardLists: () => [...libraryQueryKeys.cards(), "list"] as const,
  cardList: (filters: CardListFilters) => [...libraryQueryKeys.cardLists(), filters] as const,
  cardDetail: (cardId: string) => [...libraryQueryKeys.cards(), cardId, "detail"] as const,
  groups: () => [...libraryQueryKeys.all, "groups"] as const,
  groupList: () => [...libraryQueryKeys.groups(), "list"] as const,
  groupDetail: (groupId: string) => [...libraryQueryKeys.groups(), groupId, "detail"] as const,
  groupCards: (groupId: string) => [...libraryQueryKeys.groups(), groupId, "cards"] as const,
  sources: () => [...libraryQueryKeys.all, "sources"] as const,
  sourceLists: () => [...libraryQueryKeys.sources(), "list"] as const,
  sourceList: (filters: SourceListFilters) => [...libraryQueryKeys.sourceLists(), filters] as const,
  sourceDetail: (sourceId: string) => [...libraryQueryKeys.sources(), sourceId, "detail"] as const,
  sourceCards: (sourceId: string) => [...libraryQueryKeys.sources(), sourceId, "cards"] as const,
};
