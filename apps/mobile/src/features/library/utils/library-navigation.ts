import type { CardMutationContext } from "@/features/library/api/card-mutation-context";
import type { RootStackParamList } from "@/navigation/types";

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

export function buildReadonlyCardDetailParams(
  cardId: string,
  options?: {
    cardMutationContext?: CardMutationContext;
    sourceContextId?: string;
  },
): RootStackParamList["CardDetail"] {
  return {
    cardId,
    cardMutationContext: options?.cardMutationContext,
    mode: "source_related_readonly",
    sourceContextId: options?.sourceContextId,
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
