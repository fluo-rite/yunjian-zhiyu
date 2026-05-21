import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "../../../components/ui/screen-header";
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
import { useAssistantMessageStream } from "../hooks/use-assistant-message-stream";
import { chatScreenStyles as styles } from "./chat-screen.styles";

const EMPTY_MESSAGES: Message[] = [];

function buildChatTitle(content: string) {
  const normalized = content.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 20) || "新会话";
}

function findLatestStreamingAssistantMessage(messages: Message[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status === "streaming");
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

  const displayMessages = useMemo(
    () =>
      messages.map((message) => {
        if (message.id !== streamAssistantMessageId) {
          return message;
        }

        if (stream.terminalMessage) {
          return stream.terminalMessage;
        }

        return {
          ...message,
          content: stream.streamedContent || message.content,
        };
      }),
    [messages, stream.streamedContent, stream.terminalMessage, streamAssistantMessageId],
  );

  const fallbackTitle = useMemo(() => (chatId ? "会话详情" : "新会话"), [chatId]);
  const isSending = createChatMutation.isPending || sendChatMessageMutation.isPending || stream.isConnecting;
  const isStreaming = stream.isStreaming || abortChatMessageMutation.isPending;

  useEffect(() => {
    if (!stream.terminalMessage && !stream.errorMessage) {
      return;
    }

    void messagesQuery.refetch();
  }, [messagesQuery, stream.errorMessage, stream.terminalMessage]);

  useEffect(() => {
    if (!stream.errorMessage) {
      return;
    }

    Alert.alert("消息中断", stream.errorMessage);
  }, [stream.errorMessage]);

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
        "发送失败",
        error instanceof Error ? error.message : "这条消息暂时没有发送成功，请稍后再试。",
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
        error instanceof Error ? error.message : "暂时无法停止这次生成，请稍后再试。",
      );
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} title={chatTitle || fallbackTitle} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.content}
      >
        <ChatMessageList
          composerSpacerHeight={composerHeight}
          errorMessage={messagesQuery.error instanceof Error ? messagesQuery.error.message : undefined}
          isError={messagesQuery.isError}
          isLoading={messagesQuery.isLoading && Boolean(chatId)}
          messages={displayMessages}
          phaseLabel={stream.phaseLabel}
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
          <ChatComposer
            isAborting={abortChatMessageMutation.isPending}
            isSending={isSending}
            isStreaming={isStreaming}
            onAbort={handleAbort}
            onSend={handleSend}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
