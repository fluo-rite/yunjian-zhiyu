import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { LIBRARY_QUERY_STALE_TIME } from "@/lib/query/query-defaults";
import {
  cardGroupCardsResponseSchema,
  cardGroupListResponseSchema,
  cardGroupSchema,
  type CardGroup,
  type CardGroupCardsResponse,
  type CardGroupListResponse,
} from "@/features/library/api/library-schemas";
import {
  patchGroupDetail,
  patchGroupListItem,
  removeCardsFromCurrentGroupList,
  refreshGroupList,
  refreshGroupScope,
  removeGroupQueries,
  shouldRetryLibraryEntityQuery,
} from "@/features/library/api/library-cache";
import { libraryQueryKeys } from "@/features/library/api/library-query-keys";

export type CreateGroupInput = {
  name: string;
};

export type RenameGroupInput = {
  groupId: string;
  name: string;
};

export type UpdateGroupCardsInput = {
  groupId: string;
  cardIds: string[];
};

export async function listGroups(): Promise<CardGroupListResponse> {
  const response = await apiClient.get("/card-groups");
  return cardGroupListResponseSchema.parse(response);
}

export async function getGroup(groupId: string): Promise<CardGroup> {
  const response = await apiClient.get(`/card-groups/${groupId}`);
  return cardGroupSchema.parse(response);
}

export async function listGroupCards(groupId: string): Promise<CardGroupCardsResponse> {
  const response = await apiClient.get(`/card-groups/${groupId}/cards`);
  return cardGroupCardsResponseSchema.parse(response);
}

export async function createGroup(payload: CreateGroupInput): Promise<CardGroup> {
  const response = await apiClient.post("/card-groups", {
    body: payload,
  });

  return cardGroupSchema.parse(response);
}

export async function renameGroup(payload: RenameGroupInput): Promise<CardGroup> {
  const response = await apiClient.patch(`/card-groups/${payload.groupId}`, {
    body: {
      name: payload.name,
    },
  });

  return cardGroupSchema.parse(response);
}

export async function deleteGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/card-groups/${groupId}`);
}

export async function addCardsToGroup(payload: UpdateGroupCardsInput): Promise<void> {
  await apiClient.post(`/card-groups/${payload.groupId}/cards`, {
    body: {
      cardIds: payload.cardIds,
    },
  });
}

export async function removeCardsFromGroup(payload: UpdateGroupCardsInput): Promise<void> {
  await apiClient.delete(`/card-groups/${payload.groupId}/cards`, {
    body: {
      cardIds: payload.cardIds,
    },
  });
}

export function useGroupsQuery() {
  return useQuery({
    queryKey: libraryQueryKeys.groupList(),
    queryFn: listGroups,
    staleTime: LIBRARY_QUERY_STALE_TIME,
  });
}

export function useGroupDetailQuery(groupId: string | null) {
  return useQuery({
    queryKey: groupId
      ? libraryQueryKeys.groupDetail(groupId)
      : libraryQueryKeys.groupDetail("pending"),
    queryFn: () => getGroup(groupId as string),
    enabled: Boolean(groupId),
    staleTime: LIBRARY_QUERY_STALE_TIME,
    retry: shouldRetryLibraryEntityQuery,
  });
}

export function useGroupCardsQuery(groupId: string | null) {
  return useQuery({
    queryKey: groupId
      ? libraryQueryKeys.groupCards(groupId)
      : libraryQueryKeys.groupCards("pending"),
    queryFn: () => listGroupCards(groupId as string),
    enabled: Boolean(groupId),
    staleTime: LIBRARY_QUERY_STALE_TIME,
    retry: shouldRetryLibraryEntityQuery,
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: async () => {
      await refreshGroupList(queryClient);
    },
  });
}

export function useRenameGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: renameGroup,
    onSuccess: (group) => {
      patchGroupDetail(queryClient, group);
      patchGroupListItem(queryClient, group);
    },
  });
}

export function useDeleteGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: async (_, groupId) => {
      await removeGroupQueries(queryClient, groupId);
      await refreshGroupList(queryClient);
    },
  });
}

export function useAddCardsToGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addCardsToGroup,
    onSuccess: async (_, payload) => {
      await refreshGroupScope(queryClient, payload.groupId);
    },
  });
}

export function useRemoveCardsFromGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeCardsFromGroup,
    onSuccess: (_, payload) => {
      removeCardsFromCurrentGroupList(queryClient, payload.groupId, payload.cardIds);
    },
  });
}
