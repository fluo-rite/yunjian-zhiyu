import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
  type DocumentPickerResponse,
} from "@react-native-documents/picker";

const supportedExtensions = new Set(["pdf", "md", "markdown", "txt"]);
const supportedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

export type SelectedSourceDocument = {
  fileUri: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
};

function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split(".");
  return segments.length > 1 ? segments.at(-1) ?? "" : "";
}

export function isSupportedSourceDocument(file: {
  name: string;
  type: string | null;
}) {
  if (file.type && supportedMimeTypes.has(file.type.toLowerCase())) {
    return true;
  }

  return supportedExtensions.has(getFileExtension(file.name));
}

export function getSourceDocumentBaseName(fileName: string) {
  const normalized = fileName.trim();
  const extension = getFileExtension(normalized);

  if (!extension) {
    return normalized || "未命名来源";
  }

  return normalized.slice(0, -(extension.length + 1)).trim() || "未命名来源";
}

export function formatSelectedDocumentSize(size: number | null) {
  if (!size || size <= 0) {
    return "大小未知";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

async function copyPickedDocumentToCache(file: DocumentPickerResponse) {
  const fileName = file.name?.trim() || "document";
  const [result] = await keepLocalCopy({
    destination: "cachesDirectory",
    files: [
      {
        uri: file.uri,
        fileName,
      },
    ],
  });

  if (result.status !== "success") {
    throw new Error(result.copyError || "暂时无法读取这个文件，请重新选择后再试。");
  }

  return {
    fileUri: result.localUri,
    fileName,
    fileType: file.type,
    fileSize: file.size,
  } satisfies SelectedSourceDocument;
}

export async function pickSourceDocument(): Promise<SelectedSourceDocument | null> {
  try {
    const [file] = await pick({
      allowMultiSelection: false,
      mode: "import",
      presentationStyle: "fullScreen",
      type: [types.allFiles],
    });

    if (!isSupportedSourceDocument({ name: file.name?.trim() || "", type: file.type })) {
      throw new Error("当前仅支持 PDF、Markdown 和 TXT 文件。");
    }

    return await copyPickedDocumentToCache(file);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }

    throw error;
  }
}
