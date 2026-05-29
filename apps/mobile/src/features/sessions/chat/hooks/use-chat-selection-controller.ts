import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useCreateSourceFromMessagesMutation, type KnowledgeSource } from "@/features/library/api";
import { type Message } from "@/features/sessions/api";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import {
  buildMessageSourceName,
  getSelectedRangeMeta,
} from "@/features/sessions/utils/session-helpers";

export function useChatSelectionController(args: {
  sessionId: string | null;
  sessionTitle: string;
  fallbackTitle: string;
  messages: Message[];
  isMessagesLoading: boolean;
  isStreaming: boolean;
  onImported: (source: KnowledgeSource) => void;
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [rangeStartMessageId, setRangeStartMessageId] = useState<string | null>(null);
  const [rangeEndMessageId, setRangeEndMessageId] = useState<string | null>(null);

  const createSourceFromMessagesMutation = useCreateSourceFromMessagesMutation();
  const canEnterSelectionMode =
    Boolean(args.sessionId) &&
    args.messages.length > 0 &&
    !args.isMessagesLoading &&
    !args.isStreaming;
  const rangeMeta = useMemo(
    () => getSelectedRangeMeta(args.messages, rangeStartMessageId, rangeEndMessageId),
    [args.messages, rangeEndMessageId, rangeStartMessageId],
  );
  const selectedMessageIds = rangeMeta.selectedMessageIds;
  const selectedMessageIdSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);

  useEffect(() => {
    const existingIds = new Set(args.messages.map((message) => message.id));

    if (
      (rangeStartMessageId && !existingIds.has(rangeStartMessageId)) ||
      (rangeEndMessageId && !existingIds.has(rangeEndMessageId))
    ) {
      setRangeStartMessageId(null);
      setRangeEndMessageId(null);
    }
  }, [args.messages, rangeEndMessageId, rangeStartMessageId]);

  function exitSelectionMode() {
    setSelectionMode(false);
    setRangeStartMessageId(null);
    setRangeEndMessageId(null);
  }

  function toggleSelectionMode() {
    if (selectionMode) {
      exitSelectionMode();
      return;
    }

    setSelectionMode(true);
  }

  function toggleSelect(message: Message) {
    if (!rangeStartMessageId) {
      setRangeStartMessageId(message.id);
      setRangeEndMessageId(null);
      return;
    }

    if (!rangeEndMessageId) {
      setRangeEndMessageId(message.id);
      return;
    }

    setRangeStartMessageId(message.id);
    setRangeEndMessageId(null);
  }

  async function importSelectedMessages() {
    if (createSourceFromMessagesMutation.isPending) {
      return;
    }

    if (!rangeStartMessageId || !rangeEndMessageId || selectedMessageIds.length === 0) {
      Alert.alert(sessionCopy.chat.importEmptyTitle, sessionCopy.chat.importEmptyDescription);
      return;
    }

    try {
      const created = await createSourceFromMessagesMutation.mutateAsync({
        name: buildMessageSourceName(args.sessionTitle || args.fallbackTitle),
        messageIds: selectedMessageIds,
      });

      exitSelectionMode();
      args.onImported(created);
    } catch (error) {
      Alert.alert(
        sessionCopy.chat.importFailureTitle,
        error instanceof Error ? error.message : sessionCopy.chat.importFailureDescription,
      );
    }
  }

  return {
    selectionMode,
    selectedMessageIds,
    selectedMessageIdSet,
    rangeStartMessageId,
    rangeEndMessageId,
    rangeStatus: rangeMeta.status,
    selectedCount: rangeMeta.selectedCount,
    canEnterSelectionMode,
    isImporting: createSourceFromMessagesMutation.isPending,
    exitSelectionMode,
    toggleSelectionMode,
    toggleSelect,
    importSelectedMessages,
  };
}
