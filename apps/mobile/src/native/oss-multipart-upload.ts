import { Platform } from "react-native";

import type {
  Spec as NativeOssMultipartUploadSpec,
  UploadFeatureFlags,
  UploadPartInput,
  UploadPartResult,
} from "@/specs/NativeRNOssMultipartUpload";

const IOS_NOT_SUPPORTED_MESSAGE = "iOS native multipart upload is not implemented yet.";

class NativeUploadError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NativeUploadError";
    this.code = code;
  }
}

function createPlatformNotSupportedError() {
  return new NativeUploadError("ERR_PLATFORM_NOT_SUPPORTED", IOS_NOT_SUPPORTED_MESSAGE);
}

function getAndroidModule() {
  if (Platform.OS !== "android") {
    throw createPlatformNotSupportedError();
  }

  try {
    return require("@/specs/NativeRNOssMultipartUpload").default as NativeOssMultipartUploadSpec;
  } catch (error) {
    throw new NativeUploadError(
      "ERR_MODULE_UNAVAILABLE",
      error instanceof Error ? error.message : "Android native upload module is unavailable.",
    );
  }
}

export async function uploadPart(input: UploadPartInput): Promise<UploadPartResult> {
  const module = getAndroidModule();
  const result = await module.uploadPart(input as Object);
  return result as UploadPartResult;
}

export async function cancelPartUpload(requestId: string): Promise<void> {
  const module = getAndroidModule();
  await module.cancelPartUpload(requestId);
}

export function getUploadFeatureFlags(): UploadFeatureFlags {
  const module = getAndroidModule();
  return module.getUploadFeatureFlags() as UploadFeatureFlags;
}

export type { UploadFeatureFlags, UploadPartInput, UploadPartResult };
