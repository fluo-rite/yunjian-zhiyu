import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { resolveApiBaseUrl } from "@/config/app-config";

type TokenProvider = () => string | null | Promise<string | null>;
type UnauthorizedHandler = () => void | Promise<void>;

type ErrorPayload = {
  detail?: string | { message?: string };
} | string;

type ApiRequestConfig = Omit<AxiosRequestConfig, "auth" | "data" | "method" | "url"> & {
  body?: unknown;
  requiresAuth?: boolean;
  tokenOverride?: string | null;
};

type ApiUploadConfig = {
  body: FormData;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  tokenOverride?: string | null;
  signal?: AbortSignal;
  method?: "POST" | "PUT" | "PATCH";
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

function buildRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}

function readFallbackMessage(status: number) {
  return status > 0 ? `请求失败 (${status})` : "网络请求失败，请稍后再试。";
}

function readErrorMessageFromPayload(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return readFallbackMessage(status);
  }

  const detail = "detail" in payload ? payload.detail : undefined;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (
    detail &&
    typeof detail === "object" &&
    "message" in detail &&
    typeof detail.message === "string" &&
    detail.message.trim()
  ) {
    return detail.message;
  }

  return readFallbackMessage(status);
}

async function runUnauthorizedHandler() {
  if (!unauthorizedInFlight) {
    unauthorizedInFlight = Promise.resolve(unauthorizedHandler()).finally(() => {
      unauthorizedInFlight = null;
    });
  }

  await unauthorizedInFlight;
}

async function resolveAccessToken(config: {
  requiresAuth?: boolean;
  tokenOverride?: string | null;
}) {
  const shouldAttachAuth = config.requiresAuth !== false;

  if (config.tokenOverride !== undefined) {
    return {
      shouldAttachAuth,
      accessToken: config.tokenOverride,
    };
  }

  return {
    shouldAttachAuth,
    accessToken: shouldAttachAuth ? await accessTokenProvider() : null,
  };
}

async function parseUploadResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

const axiosInstance = axios.create({
  timeout: 15000,
});

axiosInstance.interceptors.request.use(async (config: ApiInternalRequestConfig) => {
  const { accessToken } = await resolveAccessToken({
    requiresAuth: config.requiresAuth,
    tokenOverride: config.tokenOverride,
  });

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

    return Promise.reject(new ApiError(readErrorMessageFromPayload(error.response?.data, status), status));
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
  async upload<T>(path: string, config: ApiUploadConfig) {
    const { accessToken, shouldAttachAuth } = await resolveAccessToken({
      requiresAuth: config.requiresAuth,
      tokenOverride: config.tokenOverride,
    });

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...config.headers,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete headers.Authorization;
    }

    try {
      const response = await fetch(buildRequestUrl(path), {
        method: config.method ?? "POST",
        headers,
        body: config.body,
        signal: config.signal,
      });
      const responseBody = await parseUploadResponseBody(response);

      if (response.status === 401 && shouldAttachAuth) {
        await runUnauthorizedHandler();
        throw new ApiError("登录状态已失效，请重新登录。", 401);
      }

      if (!response.ok) {
        throw new ApiError(readErrorMessageFromPayload(responseBody, response.status), response.status);
      }

      return responseBody as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        error instanceof Error && error.message ? error.message : readFallbackMessage(0),
        0,
      );
    }
  },
};

export function configureApiClient(config: {
  getAccessToken: TokenProvider;
  onUnauthorized: UnauthorizedHandler;
}) {
  accessTokenProvider = config.getAccessToken;
  unauthorizedHandler = config.onUnauthorized;
}
