import type { CardDetailMode, CardListMode, SourceDetailMode } from "./library-view-modes";

export function getCardListCapabilities(mode: CardListMode) {
  return {
    showSearch: mode === "manage",
    showStatusFilter: mode === "manage",
    showResetAll: mode === "manage",
    showHeroContext: mode === "manage",
  } as const;
}

export function getCardDetailCapabilities(mode: CardDetailMode) {
  return {
    showSourceLink: mode === "manage",
    showRelatedCardsLink: mode === "manage",
    showOperations: mode === "manage",
  } as const;
}

export function getSourceDetailCapabilities(mode: SourceDetailMode) {
  return {
    showManageActions: mode === "manage",
    showPendingConfirm: mode === "manage",
    showGeneratedCards: mode === "manage",
    showJumpToFilteredCards: mode === "manage",
  } as const;
}
