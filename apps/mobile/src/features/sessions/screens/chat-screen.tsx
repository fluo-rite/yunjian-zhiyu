import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "../../../components/ui/screen-header";
import { useCreateSourceFromMessagesMutation } from "../../../features/library/api";
import { type RootStackParamList } from "../../../navigation/types";
import {
  type Message,
  useAbortChatMessageMutation,
  useChatMessagesQuery,
  useCreateChatMutation,
  useSendChatMessageMutation,
} from "../api";
import { ChatComposer } from "../components/chat-composer";
import { ChatMessageList } from "../components/chat-message-list";
import { ChatSelectionActionBar } from "../components/chat-selection-action-bar";
import { useAssistantMessageStream } from "../hooks/use-assistant-message-stream";
import { chatScreenStyles as styles } from "./chat-screen.styles";

const EMPTY_MESSAGES: Message[] = [];

function buildChatTitle(content: string) {
  const normalized = content.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 20) || "新会话";
}

function buildMessageSourceName(chatTitle: string) {
  return `${chatTitle.trim() || "未命名会话"} 对话摘录`;
}

function findLatestStreamingAssistantMessage(messages: Message[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status === "streaming");
}

function getSelectedMessagePayload(messages: Message[], selectedIds: ReadonlySet<string>) {
  return messages
    .filter((message) => selectedIds.has(message.id))
    .map((message) => message.content.trim())
    .filter(Boolean);
}

export function ChatScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "Chat">) {
  const insets = useSafeAreaInsets();
  const [composerHeight, setComposerHeight] = useState(112);
  const [chatId, setChatId] = useState<string | null>(route.params.isNew ? null : route.params.chatId);
  const [chatTitle, setChatTitle] = useState(route.params.title);
  const [streamAssistantMessageId, setStreamAssistantMessageId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  const messagesQuery = useChatMessagesQuery(chatId);
  const createChatMutation = useCreateChatMutation();
  const sendChatMessageMutation = useSendChatMessageMutation();
  const abortChatMessageMutation = useAbortChatMessageMutation();
  const createSourceFromMessagesMutation = useCreateSourceFromMessagesMutation();
  const stream = useAssistantMessageStream(chatId, streamAssistantMessageId);
  const messages = useMemo(() => messagesQuery.data?.items ?? EMPTY_MESSAGES, [messagesQuery.data]);
  const selectedMessageIdSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);

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
    const existingIds = new Set(messages.map((message) => message.id));
    setSelectedMessageIds((current) => current.filter((messageId) => existingIds.has(messageId)));
  }, [messages]);

  const fallbackTitle = useMemo(() => (chatId ? "会话详情" : "新会话"), [chatId]);
  const isSending =
    createChatMutation.isPending || sendChatMessageMutation.isPending || stream.isConnecting;
  const isStreaming = stream.isStreaming || abortChatMessageMutation.isPending;
  const canEnterSelectionMode =
    Boolean(chatId) && messages.length > 0 && !messagesQuery.isLoading && !isStreaming;

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

    Alert.alert("消息中断", stream.errorMessage);
  }, [stream.errorMessage]);

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  }

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

  async function handleSend(content: string) {
    if (!content || isSending || isStreaming || selectionMode) {
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
        "发送失败",
        error instanceof Error
          ? error.message
          : "这条消息暂时没有发送成功，请稍后再试。",
      );
    }
  }

  async function handleAbort() {
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
        "停止失败",
        error instanceof Error
          ? error.message
          : "暂时无法停止这次生成，请稍后再试。",
      );
    }
  }

  function handleToggleSelect(message: Message) {
    setSelectedMessageIds((current) =>
      current.includes(message.id)
        ? current.filter((messageId) => messageId !== message.id)
        : [...current, message.id],
    );
  }

  async function handleImportSelectedMessages() {
    if (createSourceFromMessagesMutation.isPending) {
      return;
    }

    const selectedMessages = getSelectedMessagePayload(messages, selectedMessageIdSet);

    if (selectedMessages.length === 0) {
      Alert.alert("无法导入", "请至少选择一条包含有效文本内容的消息。");
      return;
    }

    try {
      const created = await createSourceFromMessagesMutation.mutateAsync({
        name: buildMessageSourceName(chatTitle || fallbackTitle),
        messages: selectedMessages,
      });

      exitSelectionMode();
      navigation.navigate("SourceDetail", {
        sourceId: created.id,
        sourceName: created.name,
      });
    } catch (error) {
      Alert.alert(
        "导入失败",
        error instanceof Error
          ? error.message
          : "暂时无法将这些消息导入为知识来源，请稍后再试。",
      );
    }
  }

  function handleSelectionActionPress() {
    if (selectionMode) {
      exitSelectionMode();
      return;
    }

    setSelectionMode(true);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => {
          if (selectionMode) {
            exitSelectionMode();
            return;
          }

          navigation.goBack();
        }}
        onRightPress={selectionMode || canEnterSelectionMode ? handleSelectionActionPress : undefined}
        rightLabel={selectionMode ? "取消" : canEnterSelectionMode ? "选取消息" : undefined}
        title={chatTitle || fallbackTitle}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.content}
      >
        <ChatMessageList
          composerSpacerHeight={composerHeight}
          ephemeralPhaseLabel={stream.ephemeralPhaseLabel}
          errorMessage={messagesQuery.error instanceof Error ? messagesQuery.error.message : undefined}
          isError={messagesQuery.isError}
          isLoading={messagesQuery.isLoading && Boolean(chatId)}
          messages={messages}
          onToggleSelect={selectionMode ? handleToggleSelect : undefined}
          selectedIds={selectedMessageIdSet}
          selectionMode={selectionMode}
          streamAssistantMessageId={streamAssistantMessageId}
          streamedContent={stream.streamedContent}
          terminalMessage={stream.terminalMessage}
        />

        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            if (nextHeight > 0 && nextHeight !== composerHeight) {
              setComposerHeight(nextHeight);
            }
          }}
          style={[styles.composerWrap, { paddingBottom: insets.bottom + 12 }]}
        >
          {selectionMode ? (
            <ChatSelectionActionBar
              isSubmitting={createSourceFromMessagesMutation.isPending}
              onCancel={exitSelectionMode}
              onSubmit={() => {
                handleImportSelectedMessages().catch(() => {});
              }}
              selectedCount={selectedMessageIds.length}
            />
          ) : (
            <ChatComposer
              isAborting={abortChatMessageMutation.isPending}
              isSending={isSending}
              isStreaming={isStreaming}
              onAbort={() => {
                handleAbort().catch(() => {});
              }}
              onSend={(content) => {
                handleSend(content).catch(() => {});
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
