import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import {
  useAbortSessionMessageMutation,
  useCreateSessionMutation,
  useSendSessionMessageMutation,
  useSessionMessagesQuery,
  type Message,
} from "@/features/sessions/api";
import {
  patchTerminalAssistantMessage,
  refreshSessionLists,
  refreshSessionMessages,
} from "@/features/sessions/api/session-cache";
import { useAssistantMessageStream } from "@/features/sessions/chat/hooks/use-assistant-message-stream";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import {
  buildSessionTitle,
  findLatestStreamingAssistantMessage,
} from "@/features/sessions/utils/session-helpers";

const EMPTY_MESSAGES: Message[] = [];
const ABORT_REFRESH_FALLBACK_MS = 3_000;

export function useChatSessionController(args: {
  initialSessionId: string;
  initialTitle: string;
  isNew?: boolean;
}) {
  const [sessionId, setSessionId] = useState<string | null>(
    args.isNew ? null : args.initialSessionId,
  );
  const [sessionTitle, setSessionTitle] = useState(args.initialTitle);
  const [streamAssistantMessageId, setStreamAssistantMessageId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const abortRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesQuery = useSessionMessagesQuery(sessionId);
  const createSessionMutation = useCreateSessionMutation();
  const sendSessionMessageMutation = useSendSessionMessageMutation();
  const abortSessionMessageMutation = useAbortSessionMessageMutation();
  const stream = useAssistantMessageStream(sessionId, streamAssistantMessageId);
  const messages = useMemo(() => messagesQuery.data?.items ?? EMPTY_MESSAGES, [messagesQuery.data]);

  function clearAbortRefreshFallback() {
    if (abortRefreshTimerRef.current === null) {
      return;
    }

    clearTimeout(abortRefreshTimerRef.current);
    abortRefreshTimerRef.current = null;
  }

  useEffect(() => {
    const latestStreaming = findLatestStreamingAssistantMessage(messages);

    if (!latestStreaming) {
      if (!stream.isStreaming) {
        setStreamAssistantMessageId(null);
      }
      return;
    }

    if (latestStreaming.id !== streamAssistantMessageId) {
      setStreamAssistantMessageId(latestStreaming.id);
    }
  }, [messages, stream.isStreaming, streamAssistantMessageId]);

  useEffect(() => {
    if (!sessionId || !stream.terminalMessage) {
      return;
    }

    clearAbortRefreshFallback();
    patchTerminalAssistantMessage(queryClient, sessionId, stream.terminalMessage);
    refreshSessionLists(queryClient).catch(() => {});
  }, [queryClient, sessionId, stream.terminalMessage]);

  useEffect(() => {
    if (!stream.errorMessage) {
      return;
    }

    if (stream.connectionState === "interrupted") {
      return;
    }

    Alert.alert(sessionCopy.chat.streamInterruptedTitle, stream.errorMessage);
  }, [stream.connectionState, stream.errorMessage]);

  useEffect(() => {
    return () => {
      clearAbortRefreshFallback();
    };
  }, []);

  const fallbackTitle = useMemo(
    () => (sessionId ? sessionCopy.chat.detailTitle : sessionCopy.chat.newChatTitle),
    [sessionId],
  );
  const isSending =
    createSessionMutation.isPending ||
    sendSessionMessageMutation.isPending ||
    stream.isConnecting;
  const isStreaming = stream.isStreaming || abortSessionMessageMutation.isPending;

  async function ensureSessionCreated(content: string) {
    if (sessionId) {
      return sessionId;
    }

    const created = await createSessionMutation.mutateAsync({
      title: buildSessionTitle(content),
    });

    setSessionId(created.id);
    setSessionTitle(created.title);

    return created.id;
  }

  async function sendMessage(content: string) {
    if (!content || isSending || isStreaming) {
      return;
    }

    try {
      const nextSessionId = await ensureSessionCreated(content);
      const result = await sendSessionMessageMutation.mutateAsync({
        sessionId: nextSessionId,
        content,
        options: {
          useKnowledge: true,
          useWebSearch: false,
        },
      });

      setStreamAssistantMessageId(result.assistantMessageId);
      await refreshSessionMessages(queryClient, nextSessionId);
    } catch (error) {
      Alert.alert(
        sessionCopy.chat.sendFailureTitle,
        error instanceof Error ? error.message : sessionCopy.chat.sendFailureDescription,
      );
    }
  }

  async function abortMessage() {
    if (!sessionId || !streamAssistantMessageId || abortSessionMessageMutation.isPending) {
      return;
    }

    try {
      await abortSessionMessageMutation.mutateAsync({
        sessionId,
        assistantMessageId: streamAssistantMessageId,
      });

      clearAbortRefreshFallback();
      abortRefreshTimerRef.current = setTimeout(() => {
        refreshSessionMessages(queryClient, sessionId).catch(() => {});
        abortRefreshTimerRef.current = null;
      }, ABORT_REFRESH_FALLBACK_MS);
    } catch (error) {
      Alert.alert(
        sessionCopy.chat.abortFailureTitle,
        error instanceof Error ? error.message : sessionCopy.chat.abortFailureDescription,
      );
    }
  }

  async function refreshMessages() {
    if (!sessionId) {
      return;
    }

    await refreshSessionMessages(queryClient, sessionId);
  }

  return {
    sessionId,
    sessionTitle,
    fallbackTitle,
    messages,
    messagesQuery,
    stream,
    streamAssistantMessageId,
    isSending,
    isStreaming,
    isAborting: abortSessionMessageMutation.isPending,
    sendMessage,
    abortMessage,
    refreshMessages,
  };
}

