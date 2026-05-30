import type {
  CardStatus,
  KnowledgeCard,
  KnowledgeSource,
  SourceStatus,
  SourceType,
} from "@/features/library/api";

const cardStatusLabels: Record<CardStatus, string> = {
  pending: "待确认",
  active: "已确认",
  archived: "已归档",
};

const sourceStatusLabels: Record<SourceStatus, string> = {
  processing: "处理中",
  ready: "已完成",
  failed: "处理失败",
};

const sourceTypeLabels: Record<SourceType, string> = {
  manual_text: "文本",
  document: "文件",
  messages: "消息",
};

export function getCardStatusLabel(status: CardStatus) {
  return cardStatusLabels[status];
}

export function getSourceStatusLabel(status: SourceStatus) {
  return sourceStatusLabels[status];
}

export function getSourceTypeLabel(sourceType: SourceType) {
  return sourceTypeLabels[sourceType];
}

export function formatDateTimeLabel(value: string | null | undefined) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatCompactDateTimeLabel(value: string | null | undefined) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hours}:${minutes}`;
}

export function buildCardSnippet(card: Pick<KnowledgeCard, "content">, maxLength = 110) {
  const normalized = card.content.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

export function countCardsByStatus(cards: KnowledgeCard[]) {
  return cards.reduce(
    (accumulator, card) => {
      accumulator[card.status] += 1;
      return accumulator;
    },
    {
      pending: 0,
      active: 0,
      archived: 0,
    } satisfies Record<CardStatus, number>,
  );
}

export function buildSourceMetaLine(source: Pick<KnowledgeSource, "sourceType" | "updatedAt">) {
  return `${getSourceTypeLabel(source.sourceType)} · 最近更新 ${formatCompactDateTimeLabel(source.updatedAt)}`;
}
