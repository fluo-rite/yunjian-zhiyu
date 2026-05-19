import { type KeyValueStorage } from "./key-value-storage";

export async function readJsonValue<T>(storage: KeyValueStorage, key: string) {
  const raw = await storage.getItem(key);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as T;
}

export async function writeJsonValue<T>(
  storage: KeyValueStorage,
  key: string,
  value: T,
) {
  await storage.setItem(key, JSON.stringify(value));
}

export async function removeValue(storage: KeyValueStorage, key: string) {
  await storage.removeItem(key);
}
