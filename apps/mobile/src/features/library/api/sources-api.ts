import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../../lib/api-client";
import {
  knowledgeSourceCardsResponseSchema,
  knowledgeSourceDetailSchema,
  knowledgeSourceListResponseSchema,
  knowledgeSourceSchema,
  type KnowledgeSource,
  type KnowledgeSourceCardsResponse,
  type KnowledgeSourceDetail,
  type KnowledgeSourceListResponse,
  type SourceStatus,
  type SourceType,
} from "./library-schemas";
import {
  refreshCardLists,
  refreshSourceLists,
  removeSourceQueries,
  shouldRetryLibraryEntityQuery,
} from "./library-cache";
import { libraryQueryKeys } from "./library-query-keys";

const DEFAULT_SOURCE_PAGE = 1;
const DEFAULT_SOURCE_PAGE_SIZE = 20;

export type ListSourcesParams = {
  page?: number;
  pageSize?: number;
  status?: SourceStatus;
  sourceType?: SourceType;
};

export type CreateSourceFromTextInput = {
  name: string;
  content: string;
};

export type DeleteSourceInput = {
  sourceId: string;
  deleteCards: boolean;
};

function normalizeListSourcesParams(params?: ListSourcesParams) {
  return {
    page: params?.page ?? DEFAULT_SOURCE_PAGE,
    pageSize: params?.pageSize ?? DEFAULT_SOURCE_PAGE_SIZE,
    status: params?.status,
    sourceType: params?.sourceType,
  };
}

export async function listSources(params?: ListSourcesParams): Promise<KnowledgeSourceListResponse> {
  const normalized = normalizeListSourcesParams(params);
  const response = await apiClient.get("/knowledge-sources", {
    params: {
      page: normalized.page,
      page_size: normalized.pageSize,
      status: normalized.status,
      source_type: normalized.sourceType,
    },
  });

  return knowledgeSourceListResponseSchema.parse(response);
}

export async function getSource(sourceId: string): Promise<KnowledgeSourceDetail> {
  const response = await apiClient.get(`/knowledge-sources/${sourceId}`);
  return knowledgeSourceDetailSchema.parse(response);
}

export async function listSourceCards(sourceId: string): Promise<KnowledgeSourceCardsResponse> {
  const response = await apiClient.get(`/knowledge-sources/${sourceId}/cards`);
  return knowledgeSourceCardsResponseSchema.parse(response);
}

export async function createSourceFromText(
  payload: CreateSourceFromTextInput,
): Promise<KnowledgeSource> {
  const response = await apiClient.post("/knowledge-sources/from-text", {
    body: payload,
  });

  return knowledgeSourceSchema.parse(response);
}

export async function deleteSource(payload: DeleteSourceInput): Promise<void> {
  await apiClient.delete(`/knowledge-sources/${payload.sourceId}`, {
    body: {
      deleteCards: payload.deleteCards,
    },
  });
}

export function useSourcesQuery(params?: ListSourcesParams) {
  const normalized = normalizeListSourcesParams(params);

  return useQuery({
    queryKey: libraryQueryKeys.sourceList(normalized),
    queryFn: () => listSources(normalized),
  });
}

export function useSourceDetailQuery(sourceId: string | null) {
  return useQuery({
    queryKey: sourceId
      ? libraryQueryKeys.sourceDetail(sourceId)
      : libraryQueryKeys.sourceDetail("pending"),
    queryFn: () => getSource(sourceId as string),
    enabled: Boolean(sourceId),
    retry: shouldRetryLibraryEntityQuery,
  });
}

export function useSourceCardsQuery(sourceId: string | null) {
  return useQuery({
    queryKey: sourceId
      ? libraryQueryKeys.sourceCards(sourceId)
      : libraryQueryKeys.sourceCards("pending"),
    queryFn: () => listSourceCards(sourceId as string),
    enabled: Boolean(sourceId),
    retry: shouldRetryLibraryEntityQuery,
  });
}

export function useCreateSourceFromTextMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSourceFromText,
    onSuccess: async () => {
      await refreshSourceLists(queryClient);
    },
  });
}

export function useDeleteSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSource,
    onSuccess: async (_, payload) => {
      await removeSourceQueries(queryClient, payload.sourceId);

      await Promise.all([
        refreshSourceLists(queryClient),
        ...(payload.deleteCards ? [refreshCardLists(queryClient)] : []),
      ]);
    },
  });
}
