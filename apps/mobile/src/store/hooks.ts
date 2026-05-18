export function useAppDispatch() {
  return () => undefined;
}

export function useAppSelector<T>(selector: () => T): T {
  return selector();
}
