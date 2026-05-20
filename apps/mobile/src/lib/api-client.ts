import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { resolveApiBaseUrl } from "../config/app-config";

type TokenProvider = () => string | null | Promise<string | null>;
type UnauthorizedHandler = () => void | Promise<void>;

type ErrorPayload = {
  detail?: string | { message?: string };
};

type ApiRequestConfig = Omit<AxiosRequestConfig, "auth" | "data" | "method" | "url"> & {
  body?: unknown;
  requiresAuth?: boolean;
  tokenOverride?: string | null;
};

type ApiInternalRequestConfig = InternalAxiosRequestConfig & {
  requiresAuth?: boolean;
  tokenOverride?: string | null;
};

function isFormDataPayload(value: unknown) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

let accessTokenProvider: TokenProvider = () => null;
let unauthorizedHandler: UnauthorizedHandler = () => {};
let unauthorizedInFlight: Promise<void> | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function readErrorMessage(error: AxiosError<ErrorPayload>) {
  const status = error.response?.status ?? 0;
  const fallbackMessage = status > 0 ? `请求失败 (${status})` : "网络请求失败，请稍后再试。";
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (typeof detail?.message === "string") {
    return detail.message;
  }

  return fallbackMessage;
}

async function runUnauthorizedHandler() {
  if (!unauthorizedInFlight) {
    unauthorizedInFlight = Promise.resolve(unauthorizedHandler()).finally(() => {
      unauthorizedInFlight = null;
    });
  }

  await unauthorizedInFlight;
}

const axiosInstance = axios.create({
  timeout: 15000,
});

axiosInstance.interceptors.request.use(async (config: ApiInternalRequestConfig) => {
  const shouldAttachAuth = config.requiresAuth !== false;
  const accessToken =
    config.tokenOverride !== undefined
      ? config.tokenOverride
      : shouldAttachAuth
        ? await accessTokenProvider()
        : null;

  config.baseURL = resolveApiBaseUrl();

  if (!isFormDataPayload(config.data)) {
    config.headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    config.headers.delete("Authorization");
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorPayload>) => {
    const status = error.response?.status ?? 0;
    const requestConfig = error.config as ApiInternalRequestConfig | undefined;
    const shouldHandleUnauthorized = requestConfig?.requiresAuth !== false;

    if (status === 401 && shouldHandleUnauthorized) {
      await runUnauthorizedHandler();
      return Promise.reject(new ApiError("登录状态已失效，请重新登录。", 401));
    }

    return Promise.reject(new ApiError(readErrorMessage(error), status));
  },
);

export const apiClient = {
  async get<T>(path: string, config: Omit<ApiRequestConfig, "method" | "url"> = {}) {
    const response = await axiosInstance.get<T>(path, config);
    return response.data;
  },
  async post<T>(path: string, config: Omit<ApiRequestConfig, "method" | "url"> = {}) {
    const { body, ...requestConfig } = config;
    const response = await axiosInstance.post<T>(path, body, requestConfig);
    return response.data;
  },
  async patch<T>(path: string, config: Omit<ApiRequestConfig, "method" | "url"> = {}) {
    const { body, ...requestConfig } = config;
    const response = await axiosInstance.patch<T>(path, body, requestConfig);
    return response.data;
  },
  async delete<T>(path: string, config: Omit<ApiRequestConfig, "method" | "url"> = {}) {
    const { body, ...requestConfig } = config;
    const response = await axiosInstance.delete<T>(path, {
      ...requestConfig,
      data: body,
    });
    return response.data;
  },
};

export function configureApiClient(config: {
  getAccessToken: TokenProvider;
  onUnauthorized: UnauthorizedHandler;
}) {
  accessTokenProvider = config.getAccessToken;
  unauthorizedHandler = config.onUnauthorized;
}
