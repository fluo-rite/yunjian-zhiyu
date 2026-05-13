import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import {
  createChat,
  extractApiError,
  fetchChatDetail,
  fetchChats,
  sendChatMessage,
} from "@/lib/api";
import { colors } from "@/theme/tokens";

import { MessageBubble } from "./message-bubble";
import { chatWorkspaceStyles as styles } from "./chat-workspace.styles";

function buildChatTitle(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 18) {
    return trimmed;
  }
  return `${trimmed.slice(0, 18)}...`;
}

export function ChatWorkspace() {
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draftChatMode, setDraftChatMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const chatsQuery = useQuery({
    queryKey: ["chats", "list"],
    queryFn: fetchChats,
  });

  useEffect(() => {
    const firstChatId = chatsQuery.data?.items[0]?.id ?? null;
    if (!selectedChatId && firstChatId && !draftChatMode) {
      setSelectedChatId(firstChatId);
      return;
    }

    if (
      selectedChatId &&
      chatsQuery.data &&
      !chatsQuery.data.items.some((chat) => chat.id === selectedChatId)
    ) {
      setSelectedChatId(firstChatId);
    }
  }, [draftChatMode, selectedChatId, chatsQuery.data]);

  const detailQuery = useQuery({
    queryKey: ["chats", "detail", selectedChatId],
    queryFn: () => fetchChatDetail(selectedChatId ?? ""),
    enabled: !!selectedChatId,
  });

  const createChatMutation = useMutation({
    mutationFn: createChat,
    onSuccess: async (chat) => {
      setDraftChatMode(false);
      setSelectedChatId(chat.id);
      await queryClient.invalidateQueries({ queryKey: ["chats", "list"] });
    },
    onError: (error) => {
      Alert.alert("创建会话失败", extractApiError(error));
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      chatId: string;
      content: string;
      useKnowledge: boolean;
      useWebSearch: boolean;
    }) =>
      sendChatMessage(params.chatId, {
        content: params.content,
        options: {
          useKnowledge: params.useKnowledge,
          useWebSearch: params.useWebSearch,
        },
      }),
    onSuccess: async (_, params) => {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["chats", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["chats", "detail", params.chatId] });
    },
    onError: (error) => {
      Alert.alert("发送失败", extractApiError(error));
    },
  });

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) {
      Alert.alert("先输入问题", "可以先问一个学习问题，或者让 AI 总结你的知识卡片。");
      return;
    }

    let chatId = selectedChatId;
    if (!chatId) {
      const chat = await createChatMutation.mutateAsync({ title: buildChatTitle(content) });
      chatId = chat.id;
    }

    await sendMessageMutation.mutateAsync({
      chatId,
      content,
      useKnowledge,
      useWebSearch,
    });
  };

  const isBusy = createChatMutation.isPending || sendMessageMutation.isPending;
  const messages = detailQuery.data?.messages ?? [];

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>第二开发阶段</Text>
        <Text style={styles.heroTitle}>AI 对话工作台</Text>
        <Text style={styles.heroSubtitle}>
          现在已经接上非流式问答主链路。知识库开关会参与真实卡片引用，联网搜索开关暂时保留降级提示。
        </Text>
      </View>

      <View style={styles.chatToolbar}>
        <PrimaryButton
          label="新对话"
          onPress={() => {
            setDraftChatMode(true);
            setSelectedChatId(null);
            setDraft("");
          }}
          tone="secondary"
        />
        <PrimaryButton
          label="刷新"
          onPress={() => {
            void chatsQuery.refetch();
            if (selectedChatId) {
              void detailQuery.refetch();
            }
          }}
          tone="secondary"
        />
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setUseKnowledge((value) => !value)}
          style={[styles.optionChip, useKnowledge && styles.optionChipActive]}
        >
          <Text style={[styles.optionChipLabel, useKnowledge && styles.optionChipLabelActive]}>
            知识库引用
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setUseWebSearch((value) => !value)}
          style={[styles.optionChip, useWebSearch && styles.optionChipActive]}
        >
          <Text style={[styles.optionChipLabel, useWebSearch && styles.optionChipLabelActive]}>
            联网搜索
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chatChipRow}>
        <Pressable
          onPress={() => {
            setDraftChatMode(true);
            setSelectedChatId(null);
          }}
          style={[styles.chatChip, draftChatMode && styles.chatChipActive]}
        >
          <Text style={[styles.chatChipLabel, draftChatMode && styles.chatChipLabelActive]}>
            新对话草稿
          </Text>
        </Pressable>
        {chatsQuery.data?.items.map((chat) => {
          const selected = chat.id === selectedChatId;
          return (
            <Pressable
              key={chat.id}
              onPress={() => {
                setDraftChatMode(false);
                setSelectedChatId(chat.id);
              }}
              style={[styles.chatChip, selected && styles.chatChipActive]}
            >
              <Text style={[styles.chatChipLabel, selected && styles.chatChipLabelActive]}>
                {chat.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.chatPanel}>
        {chatsQuery.isLoading || (selectedChatId && detailQuery.isLoading) ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#163d33" size="large" />
            <Text style={styles.centerStateText}>正在整理对话上下文...</Text>
          </View>
        ) : chatsQuery.isError ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateTitle}>会话加载失败</Text>
            <Text style={styles.centerStateText}>{extractApiError(chatsQuery.error)}</Text>
          </View>
        ) : detailQuery.isError ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateTitle}>对话详情加载失败</Text>
            <Text style={styles.centerStateText}>{extractApiError(detailQuery.error)}</Text>
          </View>
        ) : messages.length > 0 ? (
          <View style={styles.messageList}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>还没有对话消息</Text>
            <Text style={styles.emptyStateText}>
              可以直接让 AI 总结你的知识卡片，或者先问一个具体概念，再继续深挖。
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chatComposer}>
        <Text style={styles.sectionTitle}>发起一次提问</Text>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="例如：帮我总结我知识库里的 FastAPI 路由知识，并指出下一步该补哪些内容。"
          placeholderTextColor={colors.placeholder}
          style={styles.chatInput}
          value={draft}
        />
        <PrimaryButton
          disabled={isBusy}
          label={isBusy ? "发送中..." : "发送问题"}
          onPress={() => void handleSend()}
        />
      </View>
    </ScrollView>
  );
}
