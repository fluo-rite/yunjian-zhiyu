import { Platform } from "react-native";
import { z } from "zod";

import { ApiError, apiClient } from "@/lib/api-client";
import { cancelPartUpload, getUploadFeatureFlags, uploadPart } from "@/native/oss-multipart-upload";

const UPLOAD_MODE_THRESHOLD = 20 * 1024 * 1024;
const MULTIPART_CONCURRENCY = 3;
const MULTIPART_PART_MAX_RETRIES = 3;
const SOURCE_TYPE = "document" as const;

const directUploadInitResponseSchema = z.object({
  objectKey: z.string().min(1),
  uploadUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
});

const multipartUploadInitResponseSchema = z.object({
  objectKey: z.string().min(1),
  uploadId: z.string().min(1),
  partSize: z.number().int().positive(),
  totalParts: z.number().int().positive(),
});

const multipartPartUrlResponseSchema = z.object({
  partNumber: z.number().int().positive(),
  uploadUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
});

const completeUploadResponseSchema = z.object({
  objectKey: z.string().min(1),
  size: z.number().int().positive(),
  mimeType: z.string().nullable().optional(),
});

type InitUploadInput = {
  filename: string;
  size: number;
  mimeType: string | null;
};

type UploadKnowledgeDocumentInput = {
  fileUri: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
};

type CompletedPart = {
  partNumber: number;
  etag: string;
};

function normalizeUploadFileUri(fileUri: string) {
  if (/^[a-z]+:\/\//i.test(fileUri)) {
    return fileUri;
  }

  return `file://${fileUri}`;
}

function createRequestId(partNumber: number) {
  return `oss-part-${partNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readLocalFileBlob(fileUri: string) {
  const response = await fetch(normalizeUploadFileUri(fileUri));
  if (!response.ok) {
    throw new ApiError("Unable to read the local file.", 0);
  }

  return response.blob();
}

async function resolveFileSize(input: UploadKnowledgeDocumentInput) {
  if (typeof input.fileSize === "number" && input.fileSize > 0) {
    return input.fileSize;
  }

  const fileBlob = await readLocalFileBlob(input.fileUri);
  return fileBlob.size;
}

async function initDirectUpload(input: InitUploadInput) {
  const response = await apiClient.post("/uploads/direct/init", {
    body: {
      filename: input.filename,
      size: input.size,
      mimeType: input.mimeType,
      sourceType: SOURCE_TYPE,
    },
  });

  return directUploadInitResponseSchema.parse(response);
}

async function initMultipartUpload(input: InitUploadInput) {
  const response = await apiClient.post("/uploads/multipart/init", {
    body: {
      filename: input.filename,
      size: input.size,
      mimeType: input.mimeType,
      sourceType: SOURCE_TYPE,
    },
  });

  return multipartUploadInitResponseSchema.parse(response);
}

async function getMultipartPartUploadUrl(input: {
  objectKey: string;
  uploadId: string;
  partNumber: number;
}) {
  const response = await apiClient.post("/uploads/multipart/part-url", {
    body: {
      objectKey: input.objectKey,
      uploadId: input.uploadId,
      partNumber: input.partNumber,
    },
  });

  return multipartPartUrlResponseSchema.parse(response);
}

async function completeUpload(
  input:
    | {
        mode: "direct";
        objectKey: string;
        filename: string;
        mimeType: string | null;
      }
    | {
        mode: "multipart";
        objectKey: string;
        uploadId: string;
        filename: string;
        mimeType: string | null;
        parts: CompletedPart[];
      },
) {
  const response = await apiClient.post("/uploads/complete", {
    body: {
      mode: input.mode,
      objectKey: input.objectKey,
      uploadId: input.mode === "multipart" ? input.uploadId : undefined,
      filename: input.filename,
      mimeType: input.mimeType,
      sourceType: SOURCE_TYPE,
      parts: input.mode === "multipart" ? input.parts : undefined,
    },
  });

  return completeUploadResponseSchema.parse(response);
}

async function abortMultipartUpload(input: { objectKey: string; uploadId: string }) {
  await apiClient.post("/uploads/abort", {
    body: {
      objectKey: input.objectKey,
      uploadId: input.uploadId,
    },
  });
}

async function putDirectFileToSignedUrl(
  uploadUrl: string,
  fileUri: string,
  mimeType: string | null,
): Promise<void> {
  const fileBlob = await readLocalFileBlob(fileUri);
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: mimeType ? { "Content-Type": mimeType } : undefined,
    body: fileBlob,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || `File upload failed (${response.status})`, response.status);
  }
}

async function createUploadedDocumentSource(input: {
  name: string;
  objectKey: string;
  filename: string;
  mimeType: string | null;
  size: number;
}) {
  return apiClient.post("/knowledge-sources/from-uploaded-document", {
    body: {
      name: input.name,
      objectKey: input.objectKey,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
    },
  });
}

async function uploadMultipartDocument(input: UploadKnowledgeDocumentInput & { fileSize: number }) {
  if (Platform.OS !== "android") {
    throw new ApiError("iOS native multipart upload is not implemented yet.", 0);
  }

  const featureFlags = getUploadFeatureFlags();
  if (!featureFlags.supportsNativeMultipartPartUpload) {
    throw new ApiError("The current Android build does not support native multipart upload.", 0);
  }

  const initData = await initMultipartUpload({
    filename: input.fileName,
    size: input.fileSize,
    mimeType: input.fileType,
  });

  const requestIds = new Set<string>();

  try {
    const tasks = Array.from({ length: initData.totalParts }, (_, index) => {
      return async () => {
        const partNumber = index + 1;
        const offset = index * initData.partSize;
        const length = Math.min(initData.partSize, input.fileSize - offset);
        let lastError: unknown;

        for (let attempt = 1; attempt <= MULTIPART_PART_MAX_RETRIES; attempt += 1) {
          const requestId = createRequestId(partNumber);
          requestIds.add(requestId);

          try {
            const partUrlResponse = await getMultipartPartUploadUrl({
              objectKey: initData.objectKey,
              uploadId: initData.uploadId,
              partNumber,
            });
            const result = await uploadPart({
              requestId,
              fileUri: input.fileUri,
              partUrl: partUrlResponse.uploadUrl,
              offset,
              length,
              partNumber,
            });

            requestIds.delete(requestId);
            return {
              partNumber: result.partNumber,
              etag: result.etag,
            };
          } catch (error) {
            requestIds.delete(requestId);
            lastError = error;
          }
        }

        throw lastError instanceof Error
          ? lastError
          : new ApiError(`Part ${partNumber} upload failed.`, 0);
      };
    });

    const parts = await runWithConcurrency(tasks, MULTIPART_CONCURRENCY);
    parts.sort((left, right) => left.partNumber - right.partNumber);

    return completeUpload({
      mode: "multipart",
      objectKey: initData.objectKey,
      uploadId: initData.uploadId,
      filename: input.fileName,
      mimeType: input.fileType,
      parts,
    });
  } catch (error) {
    await Promise.all(
      Array.from(requestIds, (requestId) => cancelPartUpload(requestId).catch(() => undefined)),
    );
    await abortMultipartUpload({
      objectKey: initData.objectKey,
      uploadId: initData.uploadId,
    }).catch(() => undefined);
    throw error;
  }
}

async function uploadDirectDocument(input: UploadKnowledgeDocumentInput & { fileSize: number }) {
  const initData = await initDirectUpload({
    filename: input.fileName,
    size: input.fileSize,
    mimeType: input.fileType,
  });

  await putDirectFileToSignedUrl(initData.uploadUrl, input.fileUri, input.fileType);

  return completeUpload({
    mode: "direct",
    objectKey: initData.objectKey,
    filename: input.fileName,
    mimeType: input.fileType,
  });
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number) {
  if (tasks.length === 0) {
    return [] as T[];
  }

  const results = new Array<T>(tasks.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length) {
      const taskIndex = currentIndex;
      currentIndex += 1;
      results[taskIndex] = await tasks[taskIndex]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
  );

  return results;
}

export async function uploadKnowledgeDocument(input: UploadKnowledgeDocumentInput) {
  const fileSize = await resolveFileSize(input);
  const completedUpload =
    fileSize <= UPLOAD_MODE_THRESHOLD
      ? await uploadDirectDocument({ ...input, fileSize })
      : await uploadMultipartDocument({ ...input, fileSize });

  return completeUploadResponseSchema.parse(completedUpload);
}

export async function uploadKnowledgeDocumentAndCreateSource(input: {
  name: string;
  fileUri: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
}) {
  const completedUpload = await uploadKnowledgeDocument({
    fileUri: input.fileUri,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
  });

  return createUploadedDocumentSource({
    name: input.name,
    objectKey: completedUpload.objectKey,
    filename: input.fileName,
    mimeType: completedUpload.mimeType ?? input.fileType,
    size: completedUpload.size,
  });
}
