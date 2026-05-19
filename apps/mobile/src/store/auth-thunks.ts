import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  clearAuthSession,
  hydrateAuthSessionService,
  loginAndPersistSession,
  registerAndPersistSession,
} from "../features/auth/services/auth-service";

export const hydrateAuthSession = createAsyncThunk(
  "auth/hydrateAuthSession",
  async (_, { rejectWithValue }) => {
    try {
      return await hydrateAuthSessionService();
    } catch {
      await clearAuthSession();
      return rejectWithValue("登录状态已失效，请重新登录。");
    }
  },
);

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (
    payload: Parameters<typeof loginAndPersistSession>[0],
    { rejectWithValue },
  ) => {
    try {
      return await loginAndPersistSession(payload);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "登录失败，请稍后再试。",
      );
    }
  },
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async (
    payload: Parameters<typeof registerAndPersistSession>[0],
    { rejectWithValue },
  ) => {
    try {
      return await registerAndPersistSession(payload);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "注册失败，请稍后再试。",
      );
    }
  },
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await clearAuthSession();
});

export const expireAuthSessionThunk = createAsyncThunk(
  "auth/expireAuthSession",
  async (message: string | undefined) => {
    await clearAuthSession();
    return message ?? "登录状态已失效，请重新登录。";
  },
);
