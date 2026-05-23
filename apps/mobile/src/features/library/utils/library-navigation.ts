import type { RootStackParamList } from "../../../navigation/types";

export function buildSourceRelatedCardListParams(
  sourceId: string,
  sourceName?: string,
): RootStackParamList["CardList"] {
  return {
    mode: "source_related",
    sourceId,
    sourceName,
  };
}

export function buildReadonlyCardDetailParams(cardId: string): RootStackParamList["CardDetail"] {
  return {
    cardId,
    mode: "source_related_readonly",
  };
}

export function buildReadonlySourceDetailParams(
  sourceId: string,
  sourceName?: string,
): RootStackParamList["SourceDetail"] {
  return {
    sourceId,
    sourceName,
    mode: "card_source_readonly",
  };
}
