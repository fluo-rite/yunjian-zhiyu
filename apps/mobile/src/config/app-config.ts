import { NativeModules } from "react-native";

import appConfig from "../../app.config.json";

type ApiRuntimeConfig = {
  scheme: string;
  port: number;
  basePath: string;
  developmentBaseUrl?: string;
  releaseBaseUrl?: string;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function readBundleHost() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL;

  if (!scriptUrl) {
    return null;
  }

  const match = scriptUrl.match(/^https?:\/\/([^/:]+)/i);
  return match?.[1] ?? null;
}

function readApiConfig(): ApiRuntimeConfig {
  return appConfig.api;
}

export function resolveApiBaseUrl() {
  const config = readApiConfig();

  if (__DEV__) {
    if (config.developmentBaseUrl?.trim()) {
      return normalizeBaseUrl(config.developmentBaseUrl.trim());
    }

    const bundleHost = readBundleHost();

    if (bundleHost) {
      return `${config.scheme}://${bundleHost}:${config.port}${config.basePath}`;
    }
  }

  if (config.releaseBaseUrl?.trim()) {
    return normalizeBaseUrl(config.releaseBaseUrl.trim());
  }

  throw new Error(
    "API base URL is not configured. Please set developmentBaseUrl or releaseBaseUrl in apps/mobile/app.config.json.",
  );
}
