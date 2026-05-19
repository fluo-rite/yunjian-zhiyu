import {
  fetchCurrentUser,
  login,
  register,
  type LoginPayload,
  type RegisterPayload,
} from "../../../lib/api";
import {
  clearPersistedSession,
  persistSession,
  readPersistedSession,
  type PersistedSession,
} from "./auth-session";

export async function hydrateAuthSessionService() {
  const session = await readPersistedSession();

  if (!session) {
    return null;
  }

  const user = await fetchCurrentUser(session.tokens.accessToken);
  const normalized: PersistedSession = {
    tokens: session.tokens,
    user,
  };

  await persistSession(normalized);

  return normalized;
}

export async function loginAndPersistSession(payload: LoginPayload) {
  const response = await login(payload);
  await persistSession(response);
  return response;
}

export async function registerAndPersistSession(payload: RegisterPayload) {
  const response = await register(payload);
  await persistSession(response);
  return response;
}

export async function clearAuthSession() {
  await clearPersistedSession();
}
