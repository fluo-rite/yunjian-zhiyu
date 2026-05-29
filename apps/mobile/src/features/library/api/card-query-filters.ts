import type { CardStatus, SourceType } from "@/features/library/api/library-schemas";

const DEFAULT_CARD_PAGE = 1;
const DEFAULT_CARD_PAGE_SIZE = 20;

export type CardListFilters = {
  pageSize?: number;
  status?: CardStatus;
  sourceType?: SourceType;
  sourceId?: string;
  groupId?: string;
  keyword?: string;
};

export type ListCardsParams = CardListFilters & {
  page?: number;
};

export function normalizeCardListFilters(filters?: CardListFilters) {
  return {
    pageSize: filters?.pageSize ?? DEFAULT_CARD_PAGE_SIZE,
    status: filters?.status,
    sourceType: filters?.sourceType,
    sourceId: filters?.sourceId,
    groupId: filters?.groupId,
    keyword: filters?.keyword?.trim() || undefined,
  };
}

export function normalizeListCardsParams(params?: ListCardsParams) {
  return {
    ...normalizeCardListFilters(params),
    page: params?.page ?? DEFAULT_CARD_PAGE,
  };
}
