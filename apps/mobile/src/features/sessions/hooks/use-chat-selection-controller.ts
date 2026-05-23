import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useCreateSourceFromMessagesMutation, type KnowledgeSource } from "../../../features/library/api";
import { type Message } from "../api";
import { sessionCopy } from "../utils/session-copy";
import { buildMessageSourceName, getSelectedMessagePayload } from "../utils/session-helpers";

export function useChatSelectionController(args: {
  chatId: string | null;
  chatTitle: string;
  fallbackTitle: string;
  messages: Message[];
  isMessagesLoading: boolean;
  isStreaming: boolean;
  onImported: (source: KnowledgeSource) => void;
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  const createSourceFromMessagesMutation = useCreateSourceFromMessagesMutation();
  const selectedMessageIdSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);
  const canEnterSelectionMode =
    Boolean(args.chatId) && args.messages.length > 0 && !args.isMessagesLoading && !args.isStreaming;

  useEffect(() => {
    const existingIds = new Set(args.messages.map((message) => message.id));
    setSelectedMessageIds((current) => current.filter((messageId) => existingIds.has(messageId)));
  }, [args.messages]);

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  }

  function toggleSelectionMode() {
    if (selectionMode) {
      exitSelectionMode();
      return;
    }

    setSelectionMode(true);
  }

  function toggleSelect(message: Message) {
    setSelectedMessageIds((current) =>
      current.includes(message.id)
        ? current.filter((messageId) => messageId !== message.id)
        : [...current, message.id],
    );
  }

  async function importSelectedMessages() {
    if (createSourceFromMessagesMutation.isPending) {
      return;
    }

    const selectedMessages = getSelectedMessagePayload(args.messages, selectedMessageIdSet);

    if (selectedMessages.length === 0) {
      Alert.alert(sessionCopy.chat.importEmptyTitle, sessionCopy.chat.importEmptyDescription);
      return;
    }

    try {
      const created = await createSourceFromMessagesMutation.mutateAsync({
        name: buildMessageSourceName(args.chatTitle || args.fallbackTitle),
        messages: selectedMessages,
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
    canEnterSelectionMode,
    isImporting: createSourceFromMessagesMutation.isPending,
    exitSelectionMode,
    toggleSelectionMode,
    toggleSelect,
    importSelectedMessages,
  };
}
