import type { InfiniteData } from "@tanstack/react-query";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type PaginatedItemsResponse<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export function flattenInfiniteItems<T>(
  data: InfiniteData<PaginatedItemsResponse<T>, unknown> | undefined,
) {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

export function getNextPageFromPagination<T>(
  lastPage: PaginatedItemsResponse<T>,
) {
  return lastPage.pagination.hasMore
    ? lastPage.pagination.page + 1
    : undefined;
}
