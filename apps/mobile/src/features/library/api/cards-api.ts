import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../../lib/api-client";
import {
  archiveCardResponseSchema,
  cardListResponseSchema,
  cardSchema,
  confirmCardsResponseSchema,
  deleteCardResponseSchema,
  type CardStatus,
  type DeleteCardResponse,
  type KnowledgeCard,
  type KnowledgeCardListResponse,
  type SourceType,
} from "./library-schemas";
import {
  refreshAffectedGroups,
  refreshAffectedSourceDisplays,
  refreshAffectedSources,
  refreshCardDetail,
  refreshCardLists,
  shouldRetryLibraryEntityQuery,
  removeCardDetail,
} from "./library-cache";
import { libraryQueryKeys } from "./library-query-keys";

const DEFAULT_CARD_PAGE = 1;
const DEFAULT_CARD_PAGE_SIZE = 20;

export type ListCardsParams = {
  page?: number;
  pageSize?: number;
  status?: CardStatus;
  sourceType?: SourceType;
  sourceId?: string;
  groupId?: string;
  keyword?: string;
};

export type ConfirmCardsInput = {
  cardIds: string[];
};

function normalizeListCardsParams(params?: ListCardsParams) {
  return {
    page: params?.page ?? DEFAULT_CARD_PAGE,
    pageSize: params?.pageSize ?? DEFAULT_CARD_PAGE_SIZE,
    status: params?.status,
    sourceType: params?.sourceType,
    sourceId: params?.sourceId,
    groupId: params?.groupId,
    keyword: params?.keyword?.trim() || undefined,
  };
}

export async function listCards(params?: ListCardsParams): Promise<KnowledgeCardListResponse> {
  const normalized = normalizeListCardsParams(params);
  const response = await apiClient.get("/cards", {
    params: {
      page: normalized.page,
      page_size: normalized.pageSize,
      status: normalized.status,
      source_type: normalized.sourceType,
      source_id: normalized.sourceId,
      group_id: normalized.groupId,
      keyword: normalized.keyword,
    },
  });

  return cardListResponseSchema.parse(response);
}

export async function getCard(cardId: string): Promise<KnowledgeCard> {
  const response = await apiClient.get(`/cards/${cardId}`);
  return cardSchema.parse(response);
}

export async function confirmCards(payload: ConfirmCardsInput) {
  const response = await apiClient.post("/cards/confirm", {
    body: {
      cardIds: payload.cardIds,
    },
  });

  return confirmCardsResponseSchema.parse(response);
}

export async function archiveCard(cardId: string) {
  const response = await apiClient.post(`/cards/${cardId}/archive`);
  return archiveCardResponseSchema.parse(response);
}

export async function deleteCard(cardId: string): Promise<DeleteCardResponse> {
  const response = await apiClient.delete(`/cards/${cardId}`);
  return deleteCardResponseSchema.parse(response);
}

export function useCardsQuery(params?: ListCardsParams) {
  const normalized = normalizeListCardsParams(params);

  return useQuery({
    queryKey: libraryQueryKeys.cardList(normalized),
    queryFn: () => listCards(normalized),
  });
}

export function useCardDetailQuery(cardId: string | null) {
  return useQuery({
    queryKey: cardId ? libraryQueryKeys.cardDetail(cardId) : libraryQueryKeys.cardDetail("pending"),
    queryFn: () => getCard(cardId as string),
    enabled: Boolean(cardId),
    retry: shouldRetryLibraryEntityQuery,
  });
}

export function useConfirmCardsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmCards,
    onSuccess: async (result) => {
      const sourceIds = result.items
        .map((card) => card.sourceId)
        .filter((sourceId): sourceId is string => Boolean(sourceId));

      await Promise.all([
        refreshCardLists(queryClient),
        refreshAffectedSourceDisplays(queryClient, sourceIds),
        ...result.items.map((card) => refreshCardDetail(queryClient, card.id)),
      ]);
    },
  });
}

export function useArchiveCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveCard,
    onSuccess: async (card) => {
      await Promise.all([
        refreshCardLists(queryClient),
        refreshCardDetail(queryClient, card.id),
        ...(card.sourceId ? [refreshAffectedSources(queryClient, [card.sourceId])] : []),
      ]);
    },
  });
}

export function useDeleteCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCard,
    onSuccess: async (result, cardId) => {
      removeCardDetail(queryClient, result.deletedCardId || cardId);

      await Promise.all([
        refreshCardLists(queryClient),
        refreshAffectedSources(queryClient, result.affectedSourceIds),
        refreshAffectedGroups(queryClient, result.affectedGroupIds),
      ]);
    },
  });
}
