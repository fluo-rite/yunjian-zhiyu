# OSS 直传与大文件分片上传示例

这份示例基于当前项目的方案整理，适合在另一个项目里复用：

- 服务端签发上传 URL
- 小文件走普通直传
- 大文件走分片上传
- 前端按文件大小选择上传方式
- 上传完成后再由服务端做最终校验和落库

建议默认规则：

- `size <= 20MB`：普通直传
- `size > 20MB`：分片上传
- 默认分片大小：`5MB`
- 默认并发数：`4`

---

## 1. 服务端示例

下面示例使用 `Express + ali-oss`。

```ts
// server/upload.ts
import express from "express";
import OSS from "ali-oss";
import path from "node:path";
import crypto from "node:crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

const DIRECT_UPLOAD_EXPIRES_IN_SECONDS = 60 * 10;
const MULTIPART_PART_UPLOAD_EXPIRES_IN_SECONDS = 60 * 60;
const UPLOAD_MODE_THRESHOLD = 20 * 1024 * 1024;
const MULTIPART_UPLOAD_MAX_SIZE = 500 * 1024 * 1024;
const DEFAULT_MULTIPART_PART_SIZE = 5 * 1024 * 1024;

const client = new OSS({
  region: process.env.OSS_REGION!,
  bucket: process.env.OSS_BUCKET!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  authorizationV4: true,
  secure: true,
});

function sanitizeExtension(filename: string) {
  return path.extname(filename).replace(/[^.\w-]/g, "").toLowerCase();
}

function createObjectKey(accountId: number, type: "image" | "video", filename: string) {
  const extension = sanitizeExtension(filename);
  const date = new Date().toISOString().slice(0, 10);
  const random = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return `upload_files/${accountId}/${type}/${date}/${random}${extension}`;
}

function getObjectPrefix(accountId: number, type?: "image" | "video") {
  return `upload_files/${accountId}/${type ? `${type}/` : ""}`;
}

function getPublicUrl(objectKey: string) {
  const origin = process.env.OSS_CUSTOM_DOMAIN
    ? process.env.OSS_CUSTOM_DOMAIN
    : `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`;

  const encodedObjectKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${origin.replace(/\/$/, "")}/${encodedObjectKey}`;
}

function assertOwnedObjectKey(
  objectKey: string,
  accountId: number,
  type?: "image" | "video"
) {
  const prefix = getObjectPrefix(accountId, type);
  if (!objectKey.startsWith(prefix)) {
    throw new Error("无权操作该上传资源");
  }
}

function assertDirectUpload(size: number) {
  if (size > UPLOAD_MODE_THRESHOLD) {
    throw new Error("直传文件大小不能超过 20MB");
  }
}

function assertMultipartUpload(size: number) {
  if (size <= UPLOAD_MODE_THRESHOLD) {
    throw new Error("20MB 及以下文件请使用普通直传");
  }
  if (size > MULTIPART_UPLOAD_MAX_SIZE) {
    throw new Error("分片上传文件大小不能超过 500MB");
  }
}

// 你自己的登录态获取逻辑
function getCurrentAccountId(req: express.Request) {
  return 1001;
}

/**
 * 小文件直传初始化
 */
app.post("/uploads/direct/init", async (req, res) => {
  try {
    const { filename, size, type } = req.body as {
      filename: string;
      size: number;
      type: "image" | "video";
    };

    assertDirectUpload(size);

    const accountId = getCurrentAccountId(req);
    const objectKey = createObjectKey(accountId, type, filename);

    const uploadUrl = await client.signatureUrlV4(
      "PUT",
      DIRECT_UPLOAD_EXPIRES_IN_SECONDS,
      { headers: {} },
      objectKey
    );

    res.json({
      objectKey,
      uploadUrl,
      expiresIn: DIRECT_UPLOAD_EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "初始化失败",
    });
  }
});

/**
 * 大文件分片初始化
 */
app.post("/uploads/multipart/init", async (req, res) => {
  try {
    const { filename, size, type } = req.body as {
      filename: string;
      size: number;
      type: "image" | "video";
    };

    assertMultipartUpload(size);

    const accountId = getCurrentAccountId(req);
    const objectKey = createObjectKey(accountId, type, filename);
    const initResult = await client.initMultipartUpload(objectKey);

    res.json({
      objectKey,
      uploadId: initResult.uploadId,
      partSize: DEFAULT_MULTIPART_PART_SIZE,
      totalParts: Math.ceil(size / DEFAULT_MULTIPART_PART_SIZE),
    });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "初始化失败",
    });
  }
});

/**
 * 按需获取某个分片的签名 URL
 */
app.post("/uploads/multipart/part-url", async (req, res) => {
  try {
    const { objectKey, uploadId, partNumber } = req.body as {
      objectKey: string;
      uploadId: string;
      partNumber: number;
    };

    const accountId = getCurrentAccountId(req);
    assertOwnedObjectKey(objectKey, accountId);

    const uploadUrl = await client.signatureUrlV4(
      "PUT",
      MULTIPART_PART_UPLOAD_EXPIRES_IN_SECONDS,
      {
        queries: {
          partNumber: String(partNumber),
          uploadId,
        },
        headers: {},
      },
      objectKey
    );

    res.json({
      partNumber,
      uploadUrl,
      expiresIn: MULTIPART_PART_UPLOAD_EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "获取分片上传地址失败",
    });
  }
});

/**
 * 上传完成
 * - direct: 只做对象校验 + 落库
 * - multipart: 先 completeMultipartUpload，再校验 + 落库
 */
app.post("/uploads/complete", async (req, res) => {
  try {
    const accountId = getCurrentAccountId(req);
    const body = req.body as
      | {
          mode: "direct";
          objectKey: string;
          filename: string;
          type: "image" | "video";
        }
      | {
          mode: "multipart";
          objectKey: string;
          uploadId: string;
          filename: string;
          type: "image" | "video";
          parts: Array<{ partNumber: number; etag: string }>;
        };

    assertOwnedObjectKey(body.objectKey, accountId, body.type);

    if (body.mode === "multipart") {
      const sortedParts = body.parts
        .map((item) => ({
          number: item.partNumber,
          etag: item.etag,
        }))
        .sort((a, b) => a.number - b.number);

      await client.completeMultipartUpload(
        body.objectKey,
        body.uploadId,
        sortedParts
      );
    }

    const headResult = await client.head(body.objectKey);
    const objectSize = Number(headResult.res.headers["content-length"]);
    if (!Number.isFinite(objectSize) || objectSize <= 0) {
      throw new Error("上传文件为空");
    }

    const url = getPublicUrl(body.objectKey);

    // TODO: 这里替换成你的数据库落库逻辑
    // await resourceRepository.save({
    //   account_id: accountId,
    //   type: body.type,
    //   name: body.filename,
    //   url,
    // });

    res.json({
      message: "上传成功",
      data: { url },
    });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "完成上传失败",
    });
  }
});

/**
 * 取消未完成的分片上传
 */
app.post("/uploads/abort", async (req, res) => {
  try {
    const { objectKey, uploadId } = req.body as {
      objectKey: string;
      uploadId: string;
    };

    const accountId = getCurrentAccountId(req);
    assertOwnedObjectKey(objectKey, accountId);

    await client.abortMultipartUpload(objectKey, uploadId);
    res.json({ message: "已取消上传" });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "取消上传失败",
    });
  }
});

app.listen(3000, () => {
  console.log("server running on http://localhost:3000");
});
```

---

## 2. 前端上传示例

```ts
// client/upload-resource.ts
type UploadType = "image" | "video";

const API_BASE_URL = "http://localhost:3000";
const UPLOAD_MODE_THRESHOLD = 20 * 1024 * 1024;
const MULTIPART_CONCURRENCY = 4;
const MULTIPART_PART_MAX_RETRIES = 3;
const MULTIPART_PART_RETRY_DELAY_MS = 2000;

interface UploadResourceOptions {
  onProgress?: (percent: number | null) => void;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function request<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "请求失败");
  }

  return response.json() as Promise<T>;
}

async function putFileToSignedUrl(url: string, blob: Blob) {
  const response = await fetch(url, {
    method: "PUT",
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`上传失败，状态码：${response.status}`);
  }

  return response.headers.get("ETag");
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
) {
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  );

  return results;
}

async function initDirectUpload(input: {
  filename: string;
  size: number;
  type: UploadType;
  contentType: string;
}) {
  return request<{
    objectKey: string;
    uploadUrl: string;
    expiresIn: number;
  }>("/uploads/direct/init", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function initMultipartUpload(input: {
  filename: string;
  size: number;
  type: UploadType;
  contentType: string;
}) {
  return request<{
    objectKey: string;
    uploadId: string;
    partSize: number;
    totalParts: number;
  }>("/uploads/multipart/init", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function getMultipartPartUploadUrl(input: {
  objectKey: string;
  uploadId: string;
  partNumber: number;
}) {
  return request<{
    partNumber: number;
    uploadUrl: string;
    expiresIn: number;
  }>("/uploads/multipart/part-url", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function completeUpload(
  input:
    | {
        mode: "direct";
        objectKey: string;
        filename: string;
        type: UploadType;
      }
    | {
        mode: "multipart";
        objectKey: string;
        uploadId: string;
        filename: string;
        type: UploadType;
        parts: Array<{ partNumber: number; etag: string }>;
      }
) {
  return request<{
    message: string;
    data: { url: string };
  }>("/uploads/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function abortMultipartUpload(input: {
  objectKey: string;
  uploadId: string;
}) {
  return request("/uploads/abort", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function uploadVideoPartWithRetry(input: {
  objectKey: string;
  uploadId: string;
  partNumber: number;
  blob: Blob;
}) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MULTIPART_PART_MAX_RETRIES; attempt++) {
    try {
      const partUrlResponse = await getMultipartPartUploadUrl({
        objectKey: input.objectKey,
        uploadId: input.uploadId,
        partNumber: input.partNumber,
      });
      const etag = await putFileToSignedUrl(
        partUrlResponse.uploadUrl,
        input.blob
      );

      if (!etag) {
        throw new Error(`第 ${input.partNumber} 个分片没有返回 ETag`);
      }

      return {
        partNumber: input.partNumber,
        etag,
      };
    } catch (error) {
      lastError = error;
      if (attempt < MULTIPART_PART_MAX_RETRIES) {
        await sleep(MULTIPART_PART_RETRY_DELAY_MS * attempt);
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : "未知错误";
  throw new Error(
    `第 ${input.partNumber} 个分片重试 ${MULTIPART_PART_MAX_RETRIES} 次后仍上传失败：${reason}`
  );
}

async function uploadDirectResource(
  file: File,
  type: UploadType,
  options?: UploadResourceOptions
) {
  const initData = await initDirectUpload({
    filename: file.name,
    size: file.size,
    type,
    contentType: file.type,
  });

  options?.onProgress?.(null);
  await putFileToSignedUrl(initData.uploadUrl, file);
  const completeResult = await completeUpload({
    mode: "direct",
    objectKey: initData.objectKey,
    filename: file.name,
    type,
  });

  options?.onProgress?.(100);
  return completeResult.data.url;
}

async function uploadMultipartResource(
  file: File,
  type: UploadType,
  options?: UploadResourceOptions
) {
  const initData = await initMultipartUpload({
    filename: file.name,
    size: file.size,
    type,
    contentType: file.type,
  });
  let uploadedBytes = 0;

  try {
    const tasks = Array.from({ length: initData.totalParts }, (_, index) => {
      return async () => {
        const partNumber = index + 1;
        const start = index * initData.partSize;
        const end = Math.min(start + initData.partSize, file.size);
        const blob = file.slice(start, end);

        const result = await uploadVideoPartWithRetry({
          objectKey: initData.objectKey,
          uploadId: initData.uploadId,
          partNumber,
          blob,
        });

        uploadedBytes += blob.size;
        options?.onProgress?.(
          Math.min(99, Math.floor((uploadedBytes / file.size) * 100))
        );

        return result;
      };
    });

    const parts = await runWithConcurrency(tasks, MULTIPART_CONCURRENCY);
    const completeResult = await completeUpload({
      mode: "multipart",
      objectKey: initData.objectKey,
      uploadId: initData.uploadId,
      filename: file.name,
      type,
      parts,
    });

    options?.onProgress?.(100);
    return completeResult.data.url;
  } catch (error) {
    await abortMultipartUpload({
      objectKey: initData.objectKey,
      uploadId: initData.uploadId,
    }).catch(() => undefined);
    throw error;
  }
}

export async function uploadResource(
  file: File,
  type: UploadType,
  options?: UploadResourceOptions
) {
  if (file.size <= UPLOAD_MODE_THRESHOLD) {
    return uploadDirectResource(file, type, options);
  }

  return uploadMultipartResource(file, type, options);
}
```

---

## 3. 页面里如何调用

```ts
// client/example.ts
import { uploadResource } from "./upload-resource";

const fileInput = document.querySelector("#fileInput") as HTMLInputElement;
const progress = document.querySelector("#progress") as HTMLProgressElement;
const button = document.querySelector("#uploadBtn") as HTMLButtonElement;

button.onclick = async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  try {
    const type = file.type.startsWith("video/") ? "video" : "image";
    const url = await uploadResource(file, type, {
      onProgress(percent) {
        if (percent == null) return;
        progress.value = percent;
      },
    });

    console.log("上传完成，资源 URL：", url);
  } catch (error) {
    console.error(error);
  }
};
```

---

## 4. 这套方案的关键点

- 初始化阶段只返回上传所需信息，不返回最终资源 URL。
- 最终资源 URL 由服务端在 `complete` 成功后返回。
- 资源记录应当在 `complete` 成功后再写数据库。
- 分片失败时建议只重试该分片，不要整批直接重来。
- 失败彻底退出时调用 `abort`，避免 OSS 留下未完成分片任务。

---

## 5. OSS CORS 配置提醒

如果要让浏览器直传成功，OSS Bucket 至少要允许：

- 你的前端域名 Origin
- `PUT`
- 暴露 `ETag`

否则分片上传时浏览器拿不到 `ETag`，后面的 `completeMultipartUpload` 无法正常完成。
