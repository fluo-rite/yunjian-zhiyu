const EMPTY_ARRAY: never[] = [];

export function getStableArray<T>(value: T[] | undefined | null): T[] {
  return (value ?? EMPTY_ARRAY) as T[];
}

export function hasSameOrderedIds(current: readonly string[], next: readonly string[]) {
  return current.length === next.length && current.every((id, index) => id === next[index]);
}

export function retainExistingIds(
  current: readonly string[],
  allowedIds: ReadonlySet<string>,
): string[] {
  const next = current.filter((id) => allowedIds.has(id));
  return hasSameOrderedIds(current, next) ? (current as string[]) : next;
}
