import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { type RootStackParamList } from "../../../navigation/types";
import {
  type Message,
  useAbortChatMessageMutation,
  useChatMessagesQuery,
  useCreateChatMutation,
  useSendChatMessageMutation,
} from "../api";
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
  const [draft, setDraft] = useState("");
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

  const screenSubtitle = useMemo(() => (chatId ? "会话详情" : "新会话"), [chatId]);

  const latestAssistantCitations = useMemo(() => {
    const lastAssistantMessage = [...displayMessages].reverse().find((message) => message.role === "assistant");
    return lastAssistantMessage?.metadata?.citations ?? [];
  }, [displayMessages]);

  const isSending = createChatMutation.isPending || sendChatMessageMutation.isPending || stream.isConnecting;
  const isStreaming = stream.isStreaming || abortChatMessageMutation.isPending;

  useEffect(() => {
    if (!stream.terminalMessage && !stream.errorMessage) {
      return;
    }

    messagesQuery.refetch();
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

  async function handleSend() {
    const content = draft.trim();

    if (!content || isSending || isStreaming) {
      return;
    }

    setDraft("");

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
      setDraft(content);
      Alert.alert("发送失败", error instanceof Error ? error.message : "这条消息暂时没有发送成功，请稍后再试。");
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
      Alert.alert("停止失败", error instanceof Error ? error.message : "暂时无法停止这次生成，请稍后再试。");
    }
  }

  function handleNewChat() {
    navigation.replace("Chat", {
      chatId: `draft-${Date.now()}`,
      title: "新会话",
      isNew: true,
    });
  }

  const showWelcomeCard = !chatId && displayMessages.length === 0 && !messagesQuery.isLoading && !createChatMutation.isPending;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View style={styles.header}>
        <PrimaryButton label="返回" onPress={() => navigation.goBack()} style={styles.headerButton} variant="secondary" />
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>{screenSubtitle}</Text>
          <Text style={styles.headerTitle}>{chatTitle}</Text>
        </View>
        <PrimaryButton label="新会话" onPress={handleNewChat} style={styles.headerButton} variant="secondary" />
      </View>

      <ScrollView contentContainerStyle={styles.messages}>
        {showWelcomeCard ? (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>开始新的对话</Text>
            <Text style={styles.welcomeText}>输入你的问题、想法或要整理的内容。</Text>
          </View>
        ) : null}

        {messagesQuery.isLoading && chatId ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>正在加载会话</Text>
            <Text style={styles.infoText}>请稍候，我们正在同步当前对话内容。</Text>
          </View>
        ) : null}

        {messagesQuery.isError ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>消息加载失败</Text>
            <Text style={styles.infoText}>
              {messagesQuery.error instanceof Error ? messagesQuery.error.message : "请稍后再试。"}
            </Text>
          </View>
        ) : null}

        {stream.phaseLabel ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>当前状态</Text>
            <Text style={styles.statusText}>{stream.phaseLabel}</Text>
          </View>
        ) : null}

        {displayMessages.map((message) => {
          const isUser = message.role === "user";
          const citations = message.metadata?.citations ?? [];

          return (
            <View key={message.id} style={[styles.bubbleRow, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                <Text style={styles.bubbleRole}>{isUser ? "你" : "AI 助手"}</Text>
                <Text style={styles.bubbleText}>
                  {message.content || (message.status === "streaming" ? "正在生成回复…" : "")}
                </Text>
                {!isUser && citations.length > 0 ? <Text style={styles.citationText}>引用 {citations.length} 条来源</Text> : null}
                {!isUser && message.status === "failed" && message.errorMessage ? (
                  <Text style={styles.errorText}>{message.errorMessage}</Text>
                ) : null}
                {!isUser && message.status === "aborted" ? <Text style={styles.metaText}>本次生成已停止</Text> : null}
              </View>
            </View>
          );
        })}

        {latestAssistantCitations.length > 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>最近一次回答的来源</Text>
            {latestAssistantCitations.slice(0, 3).map((citation, index) => (
              <Text key={`${citation.title}-${index}`} style={styles.infoText}>
                {index + 1}. {citation.title}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <Field
            label="输入内容"
            multiline
            onChangeText={setDraft}
            placeholder="输入你的问题或想整理的内容"
            value={draft}
          />
          <View style={styles.actions}>
            {isStreaming ? (
              <PrimaryButton
                label={abortChatMessageMutation.isPending ? "停止中…" : "停止生成"}
                onPress={handleAbort}
                variant="secondary"
              />
            ) : null}
            <PrimaryButton
              disabled={!draft.trim() || isSending || isStreaming}
              label={isSending ? "发送中…" : "发送"}
              onPress={handleSend}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
