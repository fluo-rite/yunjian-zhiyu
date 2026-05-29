import type { SourceStatus, SourceType } from "@/features/library/api/library-schemas";

const DEFAULT_SOURCE_PAGE = 1;
const DEFAULT_SOURCE_PAGE_SIZE = 20;

export type SourceListFilters = {
  pageSize?: number;
  status?: SourceStatus;
  sourceType?: SourceType;
};

export type ListSourcesParams = SourceListFilters & {
  page?: number;
};

export function normalizeSourceListFilters(filters?: SourceListFilters) {
  return {
    pageSize: filters?.pageSize ?? DEFAULT_SOURCE_PAGE_SIZE,
    status: filters?.status,
    sourceType: filters?.sourceType,
  };
}

export function normalizeListSourcesParams(params?: ListSourcesParams) {
  return {
    ...normalizeSourceListFilters(params),
    page: params?.page ?? DEFAULT_SOURCE_PAGE,
  };
}
