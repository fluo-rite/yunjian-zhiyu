import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, apiClient } from "../../../lib/api-client";
import {
  cardGroupCardsResponseSchema,
  cardGroupListResponseSchema,
  cardGroupSchema,
  type CardGroup,
  type CardGroupCardsResponse,
  type CardGroupListResponse,
} from "./library-schemas";
import { libraryQueryKeys } from "./library-query-keys";

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

function shouldRetryGroupQuery(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  return failureCount < 2;
}

async function refreshGroupList(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: libraryQueryKeys.groupList(),
  });
}

async function refreshSingleGroup(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: libraryQueryKeys.groupDetail(groupId),
      exact: true,
    }),
    queryClient.invalidateQueries({
      queryKey: libraryQueryKeys.groupCards(groupId),
      exact: true,
    }),
  ]);
}

export function useGroupsQuery() {
  return useQuery({
    queryKey: libraryQueryKeys.groupList(),
    queryFn: listGroups,
  });
}

export function useGroupDetailQuery(groupId: string | null) {
  return useQuery({
    queryKey: groupId
      ? libraryQueryKeys.groupDetail(groupId)
      : libraryQueryKeys.groupDetail("pending"),
    queryFn: () => getGroup(groupId as string),
    enabled: Boolean(groupId),
    retry: shouldRetryGroupQuery,
  });
}

export function useGroupCardsQuery(groupId: string | null) {
  return useQuery({
    queryKey: groupId
      ? libraryQueryKeys.groupCards(groupId)
      : libraryQueryKeys.groupCards("pending"),
    queryFn: () => listGroupCards(groupId as string),
    enabled: Boolean(groupId),
    retry: shouldRetryGroupQuery,
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
    onSuccess: async (_, payload) => {
      await Promise.all([
        refreshGroupList(queryClient),
        queryClient.invalidateQueries({
          queryKey: libraryQueryKeys.groupDetail(payload.groupId),
          exact: true,
        }),
      ]);
    },
  });
}

export function useDeleteGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: async (_, groupId) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: libraryQueryKeys.groupDetail(groupId),
        }),
        queryClient.cancelQueries({
          queryKey: libraryQueryKeys.groupCards(groupId),
        }),
      ]);

      queryClient.removeQueries({
        queryKey: libraryQueryKeys.groupDetail(groupId),
      });
      queryClient.removeQueries({
        queryKey: libraryQueryKeys.groupCards(groupId),
      });

      await refreshGroupList(queryClient);
    },
  });
}

export function useAddCardsToGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addCardsToGroup,
    onSuccess: async (_, payload) => {
      await refreshSingleGroup(queryClient, payload.groupId);
    },
  });
}

export function useRemoveCardsFromGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeCardsFromGroup,
    onSuccess: async (_, payload) => {
      await refreshSingleGroup(queryClient, payload.groupId);
    },
  });
}
