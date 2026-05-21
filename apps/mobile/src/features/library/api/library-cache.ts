import { type QueryClient } from "@tanstack/react-query";

import { ApiError } from "../../../lib/api-client";
import { libraryQueryKeys } from "./library-query-keys";

function uniqueIds(ids: readonly string[]) {
  return [...new Set(ids.filter(Boolean))];
}

async function invalidateExact(queryClient: QueryClient, queryKey: readonly unknown[]) {
  await queryClient.invalidateQueries({
    queryKey,
    exact: true,
  });
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

export async function refreshCardDetail(queryClient: QueryClient, cardId: string) {
  await invalidateExact(queryClient, libraryQueryKeys.cardDetail(cardId));
}

export function removeCardDetail(queryClient: QueryClient, cardId: string) {
  queryClient.removeQueries({
    queryKey: libraryQueryKeys.cardDetail(cardId),
    exact: true,
  });
}

export async function refreshGroupList(queryClient: QueryClient) {
  await invalidateExact(queryClient, libraryQueryKeys.groupList());
}

export async function refreshGroupDetail(queryClient: QueryClient, groupId: string) {
  await invalidateExact(queryClient, libraryQueryKeys.groupDetail(groupId));
}

export async function refreshGroupCards(queryClient: QueryClient, groupId: string) {
  await invalidateExact(queryClient, libraryQueryKeys.groupCards(groupId));
}

export async function refreshGroupScope(queryClient: QueryClient, groupId: string) {
  await Promise.all([
    refreshGroupDetail(queryClient, groupId),
    refreshGroupCards(queryClient, groupId),
  ]);
}

export async function refreshAffectedGroups(queryClient: QueryClient, groupIds: readonly string[]) {
  const uniqueGroupIds = uniqueIds(groupIds);
  await Promise.all(uniqueGroupIds.map((groupId) => refreshGroupScope(queryClient, groupId)));
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

export async function refreshSourceScope(queryClient: QueryClient, sourceId: string) {
  await Promise.all([
    refreshSourceDetail(queryClient, sourceId),
    refreshSourceCards(queryClient, sourceId),
  ]);
}

export async function refreshSourceDisplayScope(queryClient: QueryClient, sourceId: string) {
  await Promise.all([
    refreshSourceDetail(queryClient, sourceId),
    refreshSourceCards(queryClient, sourceId),
  ]);
}

export async function refreshAffectedSources(
  queryClient: QueryClient,
  sourceIds: readonly string[],
) {
  const uniqueSourceIds = uniqueIds(sourceIds);
  await Promise.all(uniqueSourceIds.map((sourceId) => refreshSourceScope(queryClient, sourceId)));
}

export async function refreshAffectedSourceDisplays(
  queryClient: QueryClient,
  sourceIds: readonly string[],
) {
  const uniqueSourceIds = uniqueIds(sourceIds);
  await Promise.all(
    uniqueSourceIds.map((sourceId) => refreshSourceDisplayScope(queryClient, sourceId)),
  );
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
