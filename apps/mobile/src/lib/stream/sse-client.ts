type SseEventPayload = {
  id?: string;
  event: string;
  data: string;
};

export class SseConnectionError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SseConnectionError";
    this.status = status;
  }
}

export type SseConnectionCloseDetails = {
  closedByCaller: boolean;
  status: number;
};

export type SseConnectionOptions = {
  url: string;
  accessToken?: string | null;
  lastEventId?: string | null;
  onOpen?: () => void;
  onEvent: (event: SseEventPayload) => void;
  onError?: (error: Error) => void;
  onClose?: (details: SseConnectionCloseDetails) => void;
};

export type SseConnection = {
  close: () => void;
};

function parseEventBlock(block: string): SseEventPayload | null {
  const lines = block.split(/\r?\n/);
  let event = "message";
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
    const rawValue = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "";
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

    if (field === "event") {
      event = value || "message";
      continue;
    }

    if (field === "id") {
      id = value;
      continue;
    }

    if (field === "data") {
      dataLines.push(value);
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    id,
    event,
    data: dataLines.join("\n"),
  };
}

function extractCompleteBlocks(buffer: string) {
  const delimiterPattern = /\r?\n\r?\n/g;
  let lastMatchIndex = -1;
  let match: RegExpExecArray | null;

  while ((match = delimiterPattern.exec(buffer)) !== null) {
    lastMatchIndex = match.index + match[0].length;
  }

  if (lastMatchIndex < 0) {
    return {
      blocks: [] as string[],
      remainder: buffer,
    };
  }

  const complete = buffer.slice(0, lastMatchIndex);
  const remainder = buffer.slice(lastMatchIndex);

  return {
    blocks: complete
      .split(/\r?\n\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
    remainder,
  };
}

export function connectSse(options: SseConnectionOptions): SseConnection {
  const xhr = new XMLHttpRequest();
  let processedLength = 0;
  let buffer = "";
  let closedByCaller = false;
  let opened = false;

  const processResponseChunk = () => {
    const responseText = xhr.responseText ?? "";
    const nextChunk = responseText.slice(processedLength);

    if (!nextChunk) {
      return;
    }

    processedLength = responseText.length;
    buffer += nextChunk;

    const { blocks, remainder } = extractCompleteBlocks(buffer);
    buffer = remainder;

    for (const block of blocks) {
      const parsed = parseEventBlock(block);
      if (parsed) {
        options.onEvent(parsed);
      }
    }
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState === xhr.HEADERS_RECEIVED && !opened) {
      opened = true;
      options.onOpen?.();
    }

    if (xhr.readyState === xhr.LOADING) {
      processResponseChunk();
    }
  };

  xhr.onprogress = processResponseChunk;

  xhr.onerror = () => {
    if (closedByCaller) {
      return;
    }

    options.onError?.(new SseConnectionError("SSE connection failed.", xhr.status || undefined));
  };

  xhr.onloadend = () => {
    processResponseChunk();

    if (!closedByCaller && xhr.status >= 400) {
      options.onError?.(
        new SseConnectionError(`SSE request failed with status ${xhr.status}.`, xhr.status),
      );
    }

    options.onClose?.({
      closedByCaller,
      status: xhr.status,
    });
  };

  const streamUrl = options.lastEventId
    ? `${options.url}${options.url.includes("?") ? "&" : "?"}lastEventId=${encodeURIComponent(options.lastEventId)}`
    : options.url;

  xhr.open("GET", streamUrl, true);
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Cache-Control", "no-cache");

  if (options.accessToken) {
    xhr.setRequestHeader("Authorization", `Bearer ${options.accessToken}`);
  }

  xhr.send();

  return {
    close() {
      closedByCaller = true;
      xhr.abort();
    },
  };
}
