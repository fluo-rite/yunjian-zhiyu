import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { type AuthResponse, type AuthUser, type TokenPair } from "@/lib/api";
import { type PersistedSession } from "@/features/auth/services/auth-session";
import type { RootState } from "@/store/index";
import {
  expireAuthSessionThunk,
  hydrateAuthSession,
  loginThunk,
  logoutThunk,
  registerThunk,
} from "@/store/auth-thunks";

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
      })
      .addCase(expireAuthSessionThunk.fulfilled, (state, action) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.isSubmitting = false;
        state.isLoggingOut = false;
        state.errorMessage = action.payload;
      });
  },
});

export const { clearAuthError } = authSlice.actions;

export const authReducer = authSlice.reducer;
export {
  expireAuthSessionThunk,
  hydrateAuthSession,
  loginThunk,
  logoutThunk,
  registerThunk,
};

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
