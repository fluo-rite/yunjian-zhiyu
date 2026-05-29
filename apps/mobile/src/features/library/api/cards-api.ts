import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { getNextPageFromPagination } from "@/lib/query/infinite-query";
import { LIBRARY_QUERY_STALE_TIME } from "@/lib/query/query-defaults";
import { type CardMutationContext } from "@/features/library/api/card-mutation-context";
import {
  normalizeCardListFilters,
  normalizeListCardsParams,
  type CardListFilters,
  type ListCardsParams,
} from "@/features/library/api/card-query-filters";
import {
  archiveCardResponseSchema,
  cardListResponseSchema,
  cardSchema,
  confirmCardsResponseSchema,
  type KnowledgeCard,
  type KnowledgeCardListResponse,
} from "@/features/library/api/library-schemas";
import {
  invalidateOtherCardLists,
  patchCardDetailIfPresent,
  patchCardInContext,
  patchCardsInContext,
  removeCardFromContext,
  removeCardDetail,
  shouldRetryLibraryEntityQuery,
} from "@/features/library/api/library-cache";
import { libraryQueryKeys } from "@/features/library/api/library-query-keys";

export type ConfirmCardsInput = {
  cardIds: string[];
};

export type ConfirmCardsMutationInput = ConfirmCardsInput & {
  context: CardMutationContext;
};

export type ArchiveCardMutationInput = {
  cardId: string;
  context: CardMutationContext;
};

export type DeleteCardMutationInput = {
  cardId: string;
  context: CardMutationContext;
};

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

export async function deleteCard(cardId: string): Promise<void> {
  await apiClient.delete(`/cards/${cardId}`);
}

export function useInfiniteCardsQuery(filters?: CardListFilters) {
  const normalizedFilters = normalizeCardListFilters(filters);

  return useInfiniteQuery({
    queryKey: libraryQueryKeys.cardList(normalizedFilters),
    queryFn: ({ pageParam }) =>
      listCards({
        ...normalizedFilters,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextPageFromPagination,
    staleTime: LIBRARY_QUERY_STALE_TIME,
  });
}

export function useCardDetailQuery(cardId: string | null) {
  return useQuery({
    queryKey: cardId ? libraryQueryKeys.cardDetail(cardId) : libraryQueryKeys.cardDetail("pending"),
    queryFn: () => getCard(cardId as string),
    enabled: Boolean(cardId),
    staleTime: LIBRARY_QUERY_STALE_TIME,
    retry: shouldRetryLibraryEntityQuery,
  });
}

export function useConfirmCardsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ context: _context, ...payload }: ConfirmCardsMutationInput) =>
      confirmCards(payload),
    onSuccess: async (result, { context }) => {
      patchCardsInContext(queryClient, context, result.items);
      result.items.forEach((card) => patchCardDetailIfPresent(queryClient, card));
      await invalidateOtherCardLists(queryClient, context);
    },
  });
}

export function useArchiveCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId }: ArchiveCardMutationInput) => archiveCard(cardId),
    onSuccess: async (card, { context }) => {
      patchCardInContext(queryClient, context, card);
      patchCardDetailIfPresent(queryClient, card);
      await invalidateOtherCardLists(queryClient, context);
    },
  });
}

export function useDeleteCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId }: DeleteCardMutationInput) => deleteCard(cardId),
    onSuccess: async (_, { cardId, context }) => {
      removeCardFromContext(queryClient, context, cardId);
      removeCardDetail(queryClient, cardId);
      await invalidateOtherCardLists(queryClient, context);
    },
  });
}
