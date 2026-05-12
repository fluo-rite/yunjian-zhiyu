import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Tokens } from "@/lib/api";
import type { RootState } from "./index";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Tokens>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearSession(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.hydrated = true;
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload;
    },
  },
});

export const { clearSession, setHydrated, setSession } = authSlice.actions;

export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectHydrated = (state: RootState) => state.auth.hydrated;

export default authSlice.reducer;
