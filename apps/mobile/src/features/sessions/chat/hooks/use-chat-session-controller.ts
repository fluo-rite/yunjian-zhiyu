import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  useAbortChatMessageMutation,
  useChatMessagesQuery,
  useCreateChatMutation,
  useSendChatMessageMutation,
  type Message,
} from "@/features/sessions/api";
import { useAssistantMessageStream } from "@/features/sessions/chat/hooks/use-assistant-message-stream";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import { buildChatTitle, findLatestStreamingAssistantMessage } from "@/features/sessions/utils/session-helpers";

const EMPTY_MESSAGES: Message[] = [];

export function useChatSessionController(args: {
  initialChatId: string;
  initialTitle: string;
  isNew?: boolean;
}) {
  const [chatId, setChatId] = useState<string | null>(args.isNew ? null : args.initialChatId);
  const [chatTitle, setChatTitle] = useState(args.initialTitle);
  const [streamAssistantMessageId, setStreamAssistantMessageId] = useState<string | null>(null);

  const messagesQuery = useChatMessagesQuery(chatId);
  const createChatMutation = useCreateChatMutation();
  const sendChatMessageMutation = useSendChatMessageMutation();
  const abortChatMessageMutation = useAbortChatMessageMutation();
  const stream = useAssistantMessageStream(chatId, streamAssistantMessageId);
  const messages = useMemo(() => messagesQuery.data?.items ?? EMPTY_MESSAGES, [messagesQuery.data]);

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
    if (!stream.terminalMessage && !stream.errorMessage) {
      return;
    }

    messagesQuery.refetch().catch(() => {});
  }, [messagesQuery, stream.errorMessage, stream.terminalMessage]);

  useEffect(() => {
    if (!stream.errorMessage) {
      return;
    }

    Alert.alert(sessionCopy.chat.streamInterruptedTitle, stream.errorMessage);
  }, [stream.errorMessage]);

  const fallbackTitle = useMemo(
    () => (chatId ? sessionCopy.chat.detailTitle : sessionCopy.chat.newChatTitle),
    [chatId],
  );
  const isSending =
    createChatMutation.isPending || sendChatMessageMutation.isPending || stream.isConnecting;
  const isStreaming = stream.isStreaming || abortChatMessageMutation.isPending;

  async function ensureChatCreated(content: string) {
    if (chatId) {
      return chatId;
    }

    const created = await createChatMutation.mutateAsync({
      title: buildChatTitle(content),
    });

    setChatId(created.id);
    setChatTitle(created.title);

    return created.id;
  }

  async function sendMessage(content: string) {
    if (!content || isSending || isStreaming) {
      return;
    }

    try {
      const nextChatId = await ensureChatCreated(content);
      const result = await sendChatMessageMutation.mutateAsync({
        chatId: nextChatId,
        content,
        options: {
          useKnowledge: true,
          useWebSearch: false,
        },
      });

      setStreamAssistantMessageId(result.assistantMessageId);
      await messagesQuery.refetch();
    } catch (error) {
      Alert.alert(
        sessionCopy.chat.sendFailureTitle,
        error instanceof Error ? error.message : sessionCopy.chat.sendFailureDescription,
      );
    }
  }

  async function abortMessage() {
    if (!chatId || !streamAssistantMessageId || abortChatMessageMutation.isPending) {
      return;
    }

    try {
      await abortChatMessageMutation.mutateAsync({
        chatId,
        assistantMessageId: streamAssistantMessageId,
      });
    } catch (error) {
      Alert.alert(
        sessionCopy.chat.abortFailureTitle,
        error instanceof Error ? error.message : sessionCopy.chat.abortFailureDescription,
      );
    }
  }

  return {
    chatId,
    chatTitle,
    fallbackTitle,
    messages,
    messagesQuery,
    stream,
    streamAssistantMessageId,
    isSending,
    isStreaming,
    isAborting: abortChatMessageMutation.isPending,
    sendMessage,
    abortMessage,
  };
}

