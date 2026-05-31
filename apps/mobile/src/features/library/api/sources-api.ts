import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  flattenInfiniteItems,
  getNextPageFromPagination,
} from "@/lib/query/infinite-query";
import {
  LIBRARY_QUERY_STALE_TIME,
  PROCESSING_SOURCE_POLL_INTERVAL,
} from "@/lib/query/query-defaults";
import {
  knowledgeSourceCardsResponseSchema,
  knowledgeSourceDetailSchema,
  knowledgeSourceListResponseSchema,
  knowledgeSourceSchema,
  type KnowledgeSource,
  type KnowledgeSourceCardsResponse,
  type KnowledgeSourceDetail,
  type KnowledgeSourceListResponse,
} from "@/features/library/api/library-schemas";
import {
  refreshCardLists,
  refreshSourceLists,
  removeSourceQueries,
  shouldRetryLibraryEntityQuery,
} from "@/features/library/api/library-cache";
import { libraryQueryKeys } from "@/features/library/api/library-query-keys";
import {
  normalizeListSourcesParams,
  normalizeSourceListFilters,
  type ListSourcesParams,
  type SourceListFilters,
} from "@/features/library/api/source-query-filters";
import { uploadKnowledgeDocumentAndCreateSource } from "@/features/library/api/source-upload-api";

export type CreateSourceFromTextInput = {
  name: string;
  content: string;
};

export type CreateSourceFromMessagesInput = {
  name: string;
  messageIds: string[];
};

export type CreateSourceFromDocumentInput = {
  name: string;
  fileUri: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
};

export type DeleteSourceInput = {
  sourceId: string;
  deleteCards: boolean;
};

type SourceCardsQueryOptions = {
  pollWhileProcessing?: boolean;
};

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

export async function createSourceFromMessages(
  payload: CreateSourceFromMessagesInput,
): Promise<KnowledgeSource> {
  const response = await apiClient.post("/knowledge-sources/from-messages", {
    body: payload,
  });

  return knowledgeSourceSchema.parse(response);
}

export async function createSourceFromDocument(
  payload: CreateSourceFromDocumentInput,
): Promise<KnowledgeSource> {
  const response = await uploadKnowledgeDocumentAndCreateSource({
    name: payload.name,
    fileUri: payload.fileUri,
    fileName: payload.fileName,
    fileType: payload.fileType,
    fileSize: payload.fileSize,
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

export function useInfiniteSourcesQuery(filters?: SourceListFilters) {
  const normalizedFilters = normalizeSourceListFilters(filters);
  const [pollWhileProcessing, setPollWhileProcessing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: libraryQueryKeys.sourceList(normalizedFilters),
    queryFn: ({ pageParam }) =>
      listSources({
        ...normalizedFilters,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: getNextPageFromPagination,
    staleTime: pollWhileProcessing ? 0 : LIBRARY_QUERY_STALE_TIME,
    refetchInterval: pollWhileProcessing ? PROCESSING_SOURCE_POLL_INTERVAL : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const hasProcessingItems = flattenInfiniteItems(query.data).some(
      (source) => source.status === "processing",
    );
    setPollWhileProcessing((current) => (current === hasProcessingItems ? current : hasProcessingItems));
  }, [query.data]);

  return query;
}

export function useSourceDetailQuery(sourceId: string | null) {
  const [pollWhileProcessing, setPollWhileProcessing] = useState(false);

  const query = useQuery({
    queryKey: sourceId
      ? libraryQueryKeys.sourceDetail(sourceId)
      : libraryQueryKeys.sourceDetail("pending"),
    queryFn: () => getSource(sourceId as string),
    enabled: Boolean(sourceId),
    staleTime: pollWhileProcessing ? 0 : LIBRARY_QUERY_STALE_TIME,
    refetchInterval: pollWhileProcessing ? PROCESSING_SOURCE_POLL_INTERVAL : false,
    refetchIntervalInBackground: false,
    retry: shouldRetryLibraryEntityQuery,
  });

  useEffect(() => {
    const isProcessing = query.data?.status === "processing";
    setPollWhileProcessing((current) => (current === isProcessing ? current : isProcessing));
  }, [query.data?.status]);

  return query;
}

export function useSourceCardsQuery(sourceId: string | null, options?: SourceCardsQueryOptions) {
  return useQuery({
    queryKey: sourceId
      ? libraryQueryKeys.sourceCards(sourceId)
      : libraryQueryKeys.sourceCards("pending"),
    queryFn: () => listSourceCards(sourceId as string),
    enabled: Boolean(sourceId),
    staleTime: options?.pollWhileProcessing ? 0 : LIBRARY_QUERY_STALE_TIME,
    refetchInterval: options?.pollWhileProcessing ? PROCESSING_SOURCE_POLL_INTERVAL : false,
    refetchIntervalInBackground: false,
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

export function useCreateSourceFromMessagesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSourceFromMessages,
    onSuccess: async () => {
      await refreshSourceLists(queryClient);
    },
  });
}

export function useCreateSourceFromDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSourceFromDocument,
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
