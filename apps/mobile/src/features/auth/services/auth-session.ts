import { type AuthUser, type TokenPair } from "../../../lib/api";
import { asyncStorageAdapter } from "../../../lib/storage/async-storage-adapter";
import {
  readJsonValue,
  removeValue,
  writeJsonValue,
} from "../../../lib/storage/json-storage";

const AUTH_STORAGE_KEY = "yunjian.auth.session";

export type PersistedSession = {
  tokens: TokenPair;
  user: AuthUser;
};

export async function readPersistedSession() {
  return readJsonValue<PersistedSession>(asyncStorageAdapter, AUTH_STORAGE_KEY);
}

export async function persistSession(session: PersistedSession) {
  await writeJsonValue(asyncStorageAdapter, AUTH_STORAGE_KEY, session);
}

export async function clearPersistedSession() {
  await removeValue(asyncStorageAdapter, AUTH_STORAGE_KEY);
}
