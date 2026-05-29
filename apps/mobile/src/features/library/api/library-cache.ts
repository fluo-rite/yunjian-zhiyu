import { type InfiniteData, type QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-client";
import { type CardMutationContext } from "@/features/library/api/card-mutation-context";
import { libraryQueryKeys } from "@/features/library/api/library-query-keys";
import { type PaginatedItemsResponse } from "@/lib/query/infinite-query";
import {
  type CardGroup,
  type CardGroupCardsResponse,
  type KnowledgeCard,
  type KnowledgeSourceCardsResponse,
} from "@/features/library/api/library-schemas";

async function invalidateExact(queryClient: QueryClient, queryKey: readonly unknown[]) {
  await queryClient.invalidateQueries({
    queryKey,
    exact: true,
  });
}

function getCardMutationContextQueryKey(context: CardMutationContext) {
  switch (context.kind) {
    case "all_cards_list":
      return libraryQueryKeys.cardList(context.filters);
    case "source_cards":
      return libraryQueryKeys.sourceCards(context.sourceId);
    case "group_cards":
      return libraryQueryKeys.groupCards(context.groupId);
    case "card_detail_only":
      return null;
  }
}

function serializeQueryKey(queryKey: readonly unknown[]) {
  return JSON.stringify(queryKey);
}

function isCardListLikeQueryKey(queryKey: readonly unknown[]) {
  return (
    queryKey.length >= 3 &&
    queryKey[0] === "library" &&
    ((queryKey[1] === "cards" && queryKey[2] === "list") ||
      (queryKey[1] === "sources" && queryKey[3] === "cards") ||
      (queryKey[1] === "groups" && queryKey[3] === "cards"))
  );
}

function patchCardItems(
  items: readonly KnowledgeCard[],
  replacements: ReadonlyMap<string, KnowledgeCard>,
) {
  let didUpdate = false;

  const nextItems = items.map((item) => {
    const replacement = replacements.get(item.id);

    if (!replacement) {
      return item;
    }

    didUpdate = true;
    return replacement;
  });

  return {
    didUpdate,
    items: nextItems,
  };
}

function patchInfiniteCardListResponse(
  current:
    | InfiniteData<PaginatedItemsResponse<KnowledgeCard>, unknown>
    | undefined,
  replacements: ReadonlyMap<string, KnowledgeCard>,
) {
  if (!current) {
    return current;
  }

  let didUpdate = false;
  const pages = current.pages.map((page) => {
    const result = patchCardItems(page.items, replacements);

    if (!result.didUpdate) {
      return page;
    }

    didUpdate = true;
    return {
      ...page,
      items: result.items,
    };
  });

  if (!didUpdate) {
    return current;
  }

  return {
    ...current,
    pages,
  };
}

function patchFlatCardListResponse(
  current: CardGroupCardsResponse | KnowledgeSourceCardsResponse | undefined,
  replacements: ReadonlyMap<string, KnowledgeCard>,
) {
  if (!current) {
    return current;
  }

  const result = patchCardItems(current.items, replacements);

  if (!result.didUpdate) {
    return current;
  }

  return {
    ...current,
    items: result.items,
  };
}

function removeCardItems(items: readonly KnowledgeCard[], cardIds: ReadonlySet<string>) {
  const nextItems = items.filter((item) => !cardIds.has(item.id));
  return {
    removedCount: items.length - nextItems.length,
    items: nextItems,
  };
}

function removeInfiniteCardListResponse(
  current:
    | InfiniteData<PaginatedItemsResponse<KnowledgeCard>, unknown>
    | undefined,
  cardIds: ReadonlySet<string>,
) {
  if (!current) {
    return current;
  }

  let removedCount = 0;
  const pages = current.pages.map((page) => {
    const result = removeCardItems(page.items, cardIds);
    removedCount += result.removedCount;

    if (result.removedCount === 0) {
      return page;
    }

    return {
      ...page,
      items: result.items,
    };
  });

  if (removedCount === 0) {
    return current;
  }

  return {
    ...current,
    pages: pages.map((page) => ({
      ...page,
      pagination: {
        ...page.pagination,
        total: Math.max(0, page.pagination.total - removedCount),
      },
    })),
  };
}

function removeFlatCardListResponse(
  current: CardGroupCardsResponse | KnowledgeSourceCardsResponse | undefined,
  cardIds: ReadonlySet<string>,
) {
  if (!current) {
    return current;
  }

  const result = removeCardItems(current.items, cardIds);

  if (result.removedCount === 0) {
    return current;
  }

  return {
    ...current,
    items: result.items,
  };
}

export function shouldRetryLibraryEntityQuery(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
}

export async function refreshCardLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: libraryQueryKeys.cardLists(),
  });
}

export function patchCardDetailIfPresent(queryClient: QueryClient, card: KnowledgeCard) {
  const queryKey = libraryQueryKeys.cardDetail(card.id);

  if (queryClient.getQueryData(queryKey) === undefined) {
    return;
  }

  queryClient.setQueryData(queryKey, card);
}

export function removeCardDetail(queryClient: QueryClient, cardId: string) {
  queryClient.removeQueries({
    queryKey: libraryQueryKeys.cardDetail(cardId),
    exact: true,
  });
}

export function patchCardInContext(
  queryClient: QueryClient,
  context: CardMutationContext,
  card: KnowledgeCard,
) {
  patchCardsInContext(queryClient, context, [card]);
}

export function patchCardsInContext(
  queryClient: QueryClient,
  context: CardMutationContext,
  cards: readonly KnowledgeCard[],
) {
  if (cards.length === 0 || context.kind === "card_detail_only") {
    return;
  }

  const replacements = new Map(cards.map((card) => [card.id, card]));

  switch (context.kind) {
    case "all_cards_list":
      queryClient.setQueryData(
        libraryQueryKeys.cardList(context.filters),
        (
          current:
            | InfiniteData<PaginatedItemsResponse<KnowledgeCard>, unknown>
            | undefined,
        ) => patchInfiniteCardListResponse(current, replacements),
      );
      return;
    case "source_cards":
      queryClient.setQueryData(
        libraryQueryKeys.sourceCards(context.sourceId),
        (current: KnowledgeSourceCardsResponse | undefined) =>
          patchFlatCardListResponse(current, replacements),
      );
      return;
    case "group_cards":
      queryClient.setQueryData(
        libraryQueryKeys.groupCards(context.groupId),
        (current: CardGroupCardsResponse | undefined) =>
          patchFlatCardListResponse(current, replacements),
      );
      return;
  }
}

export function removeCardFromContext(
  queryClient: QueryClient,
  context: CardMutationContext,
  cardId: string,
) {
  removeCardsFromContext(queryClient, context, [cardId]);
}

export function removeCardsFromContext(
  queryClient: QueryClient,
  context: CardMutationContext,
  cardIds: readonly string[],
) {
  if (cardIds.length === 0 || context.kind === "card_detail_only") {
    return;
  }

  const removedIdSet = new Set(cardIds);

  switch (context.kind) {
    case "all_cards_list":
      queryClient.setQueryData(
        libraryQueryKeys.cardList(context.filters),
        (
          current:
            | InfiniteData<PaginatedItemsResponse<KnowledgeCard>, unknown>
            | undefined,
        ) => removeInfiniteCardListResponse(current, removedIdSet),
      );
      return;
    case "source_cards":
      queryClient.setQueryData(
        libraryQueryKeys.sourceCards(context.sourceId),
        (current: KnowledgeSourceCardsResponse | undefined) =>
          removeFlatCardListResponse(current, removedIdSet),
      );
      return;
    case "group_cards":
      queryClient.setQueryData(
        libraryQueryKeys.groupCards(context.groupId),
        (current: CardGroupCardsResponse | undefined) =>
          removeFlatCardListResponse(current, removedIdSet),
      );
      return;
  }
}

export async function invalidateOtherCardLists(
  queryClient: QueryClient,
  context: CardMutationContext,
) {
  const currentQueryKey = getCardMutationContextQueryKey(context);
  const currentSerializedKey = currentQueryKey
    ? serializeQueryKey(currentQueryKey)
    : null;

  await queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as readonly unknown[];

      if (!isCardListLikeQueryKey(queryKey)) {
        return false;
      }

      if (!currentSerializedKey) {
        return true;
      }

      return serializeQueryKey(queryKey) !== currentSerializedKey;
    },
  });
}

export async function refreshGroupList(queryClient: QueryClient) {
  await invalidateExact(queryClient, libraryQueryKeys.groupList());
}

export function patchGroupListItem(queryClient: QueryClient, group: CardGroup) {
  queryClient.setQueryData(
    libraryQueryKeys.groupList(),
    (current: { items: CardGroup[] } | undefined) => {
      if (!current) {
        return current;
      }

      let didUpdate = false;
      const items = current.items.map((item) => {
        if (item.id !== group.id) {
          return item;
        }

        didUpdate = true;
        return group;
      });

      if (!didUpdate) {
        return current;
      }

      return {
        ...current,
        items,
      };
    },
  );
}

export async function refreshGroupDetail(queryClient: QueryClient, groupId: string) {
  await invalidateExact(queryClient, libraryQueryKeys.groupDetail(groupId));
}

export function patchGroupDetail(queryClient: QueryClient, group: CardGroup) {
  queryClient.setQueryData(libraryQueryKeys.groupDetail(group.id), group);
}

export async function refreshGroupCards(queryClient: QueryClient, groupId: string) {
  await invalidateExact(queryClient, libraryQueryKeys.groupCards(groupId));
}

export function removeCardsFromCurrentGroupList(
  queryClient: QueryClient,
  groupId: string,
  cardIds: readonly string[],
) {
  const removedIdSet = new Set(cardIds);

  queryClient.setQueryData(
    libraryQueryKeys.groupCards(groupId),
    (current: CardGroupCardsResponse | undefined) =>
      removeFlatCardListResponse(current, removedIdSet),
  );
}

export async function refreshGroupScope(queryClient: QueryClient, groupId: string) {
  await Promise.all([
    refreshGroupDetail(queryClient, groupId),
    refreshGroupCards(queryClient, groupId),
  ]);
}

export async function removeGroupQueries(queryClient: QueryClient, groupId: string) {
  await Promise.all([
    queryClient.cancelQueries({
      queryKey: libraryQueryKeys.groupDetail(groupId),
      exact: true,
    }),
    queryClient.cancelQueries({
      queryKey: libraryQueryKeys.groupCards(groupId),
      exact: true,
    }),
  ]);

  queryClient.removeQueries({
    queryKey: libraryQueryKeys.groupDetail(groupId),
    exact: true,
  });
  queryClient.removeQueries({
    queryKey: libraryQueryKeys.groupCards(groupId),
    exact: true,
  });
}

export async function refreshSourceLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: libraryQueryKeys.sourceLists(),
  });
}

export async function refreshSourceDetail(queryClient: QueryClient, sourceId: string) {
  await invalidateExact(queryClient, libraryQueryKeys.sourceDetail(sourceId));
}

export async function refreshSourceCards(queryClient: QueryClient, sourceId: string) {
  await invalidateExact(queryClient, libraryQueryKeys.sourceCards(sourceId));
}

export async function removeSourceQueries(queryClient: QueryClient, sourceId: string) {
  await Promise.all([
    queryClient.cancelQueries({
      queryKey: libraryQueryKeys.sourceDetail(sourceId),
      exact: true,
    }),
    queryClient.cancelQueries({
      queryKey: libraryQueryKeys.sourceCards(sourceId),
      exact: true,
    }),
  ]);

  queryClient.removeQueries({
    queryKey: libraryQueryKeys.sourceDetail(sourceId),
    exact: true,
  });
  queryClient.removeQueries({
    queryKey: libraryQueryKeys.sourceCards(sourceId),
    exact: true,
  });
}
