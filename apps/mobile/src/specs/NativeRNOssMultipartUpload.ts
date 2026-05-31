import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type UploadPartInput = {
  requestId: string;
  fileUri: string;
  partUrl: string;
  offset: number;
  length: number;
  partNumber: number;
  contentType?: string | null;
  headers?: Record<string, string>;
};

export type UploadPartResult = {
  requestId: string;
  partNumber: number;
  etag: string;
  statusCode: number;
  bytesSent: number;
};

export type UploadFeatureFlags = {
  supportsNativeMultipartPartUpload: boolean;
  supportsBackgroundUpload: boolean;
  supportsResumeAcrossLaunch: boolean;
};

export interface Spec extends TurboModule {
  uploadPart(input: Object): Promise<Object>;
  cancelPartUpload(requestId: string): Promise<void>;
  getUploadFeatureFlags(): Object;
}

export default TurboModuleRegistry.get<Spec>("RNOssMultipartUpload");
