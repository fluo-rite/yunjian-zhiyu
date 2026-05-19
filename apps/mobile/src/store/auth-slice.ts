import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  fetchCurrentUser,
  login,
  register,
  type AuthResponse,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
  type TokenPair,
} from "../lib/api";
import type { RootState } from "./index";

const AUTH_STORAGE_KEY = "yunjian.auth.session";

type PersistedSession = {
  tokens: TokenPair;
  user: AuthUser;
};

type AuthState = {
  user: AuthUser | null;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isSubmitting: boolean;
  isLoggingOut: boolean;
  errorMessage: string | null;
};

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isHydrating: true,
  isSubmitting: false,
  isLoggingOut: false,
  errorMessage: null,
};

async function persistSession(payload: PersistedSession) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

async function clearPersistedSession() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

export const hydrateAuthSession = createAsyncThunk(
  "auth/hydrateAuthSession",
  async (_, { rejectWithValue }) => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const session = JSON.parse(raw) as PersistedSession;
      const user = await fetchCurrentUser(session.tokens.accessToken);
      const normalized = {
        tokens: session.tokens,
        user,
      };

      await persistSession(normalized);

      return normalized;
    } catch {
      await clearPersistedSession();
      return rejectWithValue("登录状态已失效，请重新登录。");
    }
  },
);

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const response = await login(payload);
      await persistSession(response);
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "登录失败，请稍后再试。",
      );
    }
  },
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      const response = await register(payload);
      await persistSession(response);
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "注册失败，请稍后再试。",
      );
    }
  },
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await clearPersistedSession();
});

function applyAuthSuccess(state: AuthState, payload: AuthResponse | PersistedSession) {
  state.user = payload.user;
  state.tokens = payload.tokens;
  state.isAuthenticated = true;
  state.isSubmitting = false;
  state.errorMessage = null;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.errorMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuthSession.pending, (state) => {
        state.isHydrating = true;
        state.errorMessage = null;
      })
      .addCase(
        hydrateAuthSession.fulfilled,
        (state, action: PayloadAction<PersistedSession | null>) => {
          state.isHydrating = false;

          if (!action.payload) {
            state.user = null;
            state.tokens = null;
            state.isAuthenticated = false;
            return;
          }

          applyAuthSuccess(state, action.payload);
        },
      )
      .addCase(hydrateAuthSession.rejected, (state, action) => {
        state.isHydrating = false;
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.errorMessage =
          typeof action.payload === "string" ? action.payload : "登录状态恢复失败。";
      })
      .addCase(loginThunk.pending, (state) => {
        state.isSubmitting = true;
        state.isLoggingOut = false;
        state.errorMessage = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        applyAuthSuccess(state, action.payload);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage =
          typeof action.payload === "string" ? action.payload : "登录失败，请稍后再试。";
      })
      .addCase(registerThunk.pending, (state) => {
        state.isSubmitting = true;
        state.isLoggingOut = false;
        state.errorMessage = null;
      })
      .addCase(registerThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        applyAuthSuccess(state, action.payload);
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage =
          typeof action.payload === "string" ? action.payload : "注册失败，请稍后再试。";
      })
      .addCase(logoutThunk.pending, (state) => {
        state.isLoggingOut = true;
        state.errorMessage = null;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.isSubmitting = false;
        state.isLoggingOut = false;
        state.errorMessage = null;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.isLoggingOut = false;
        state.errorMessage =
          typeof action.error.message === "string"
            ? action.error.message
            : "退出登录失败，请稍后再试。";
      });
  },
});

export const { clearAuthError } = authSlice.actions;

export const authReducer = authSlice.reducer;

export function selectAuthUser(state: RootState) {
  return state.auth.user;
}

export function selectAccessToken(state: RootState) {
  return state.auth.tokens?.accessToken ?? null;
}

export function selectIsAuthenticated(state: RootState) {
  return state.auth.isAuthenticated;
}

export function selectIsHydrating(state: RootState) {
  return state.auth.isHydrating;
}

export function selectIsSubmittingAuth(state: RootState) {
  return state.auth.isSubmitting;
}

export function selectIsLoggingOut(state: RootState) {
  return state.auth.isLoggingOut;
}

export function selectAuthErrorMessage(state: RootState) {
  return state.auth.errorMessage;
}
