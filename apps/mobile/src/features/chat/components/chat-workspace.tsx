import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import {
  abortChatMessage,
  createChat,
  createChatMessage,
  extractApiError,
  fetchChatMessages,
  fetchChats,
  type Message,
} from "@/lib/api";
import {
  chatStream,
  clearLastStreamEventId,
  loadLastStreamEventId,
  saveLastStreamEventId,
  type AgentStreamEvent,
} from "@/lib/chat-stream";
import { selectAccessToken } from "@/store/auth-slice";
import { useAppSelector } from "@/store/hooks";
import { colors } from "@/theme/tokens";

import { chatWorkspaceStyles as styles } from "./chat-workspace.styles";
import { MessageBubble } from "./message-bubble";

function buildChatTitle(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 18) {
    return trimmed;
  }
  return `${trimmed.slice(0, 18)}...`;
}

function buildOptimisticUserMessage(params: {
  chatId: string;
  content: string;
  useKnowledge: boolean;
  useWebSearch: boolean;
}): Message {
  return {
    id: `user-temp-${Date.now()}`,
    chatId: params.chatId,
    role: "user",
    status: "done",
    content: params.content,
    errorMessage: null,
    streamUrl: null,
    createdAt: new Date().toISOString(),
    metadata: {
      requestedUseKnowledge: params.useKnowledge,
      requestedUseWebSearch: params.useWebSearch,
    },
  };
}

function replaceOrAppendMessage(messages: Message[], nextMessage: Message) {
  let hasReplaced = false;
  const updated = messages.map((message) => {
    if (message.id !== nextMessage.id) {
      return message;
    }
    hasReplaced = true;
    return nextMessage;
  });

  if (hasReplaced) {
    return updated;
  }

  return [...messages, nextMessage];
}

function applyStreamEvent(messages: Message[], event: AgentStreamEvent): Message[] {
  switch (event.event) {
    case "message.start": {
      if (messages.some((message) => message.id === event.data.messageId)) {
        return messages;
      }

      return [
        ...messages,
        {
          id: event.data.messageId,
          chatId: event.data.chatId,
          role: event.data.role,
          status: "streaming",
          content: "",
          errorMessage: null,
          streamUrl: null,
          createdAt: new Date().toISOString(),
          metadata: { streaming: true },
        },
      ];
    }

    case "message.delta":
      return messages.map((message) =>
        message.id === event.data.messageId
          ? {
              ...message,
              status: "streaming",
              content: `${message.content}${event.data.delta}`,
              metadata: {
                ...message.metadata,
                streaming: true,
              },
            }
          : message,
      );

    case "message.done":
      return replaceOrAppendMessage(messages, event.data.message);

    case "message.aborted":
      return replaceOrAppendMessage(messages, event.data.message);

    case "error":
      if (event.data.finalMessage) {
        return replaceOrAppendMessage(messages, event.data.finalMessage);
      }

      if (!event.data.messageId) {
        return messages;
      }

      return messages.map((message) =>
        message.id === event.data.messageId
          ? {
              ...message,
              status: "failed",
              errorMessage: event.data.message,
              metadata: {
                ...message.metadata,
                streaming: false,
                error: event.data.message,
              },
            }
          : message,
      );
  }
}

export function ChatWorkspace() {
  const accessToken = useAppSelector(selectAccessToken);
  const queryClient = useQueryClient();
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draftChatMode, setDraftChatMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [streamMessages, setStreamMessages] = useState<{ chatId: string; messages: Message[] } | null>(
    null,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeStreamMessageId, setActiveStreamMessageId] = useState<string | null>(null);

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

  const messagesQuery = useQuery({
    queryKey: ["chats", "messages", selectedChatId],
    queryFn: () => fetchChatMessages(selectedChatId ?? ""),
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
      Alert.alert("Create chat failed", extractApiError(error));
    },
  });

  const displayedMessages =
    streamMessages && selectedChatId === streamMessages.chatId
      ? streamMessages.messages
      : messagesQuery.data?.items ?? [];

  const consumeStream = useCallback(
    async (params: {
      chatId: string;
      assistantMessageId: string;
      streamUrl: string;
      initialMessages: Message[];
    }) => {
      if (!accessToken) {
        return;
      }

      setIsStreaming(true);
      setActiveStreamMessageId(params.assistantMessageId);
      setStreamMessages({
        chatId: params.chatId,
        messages: params.initialMessages,
      });

      const lastEventId = (await loadLastStreamEventId(params.assistantMessageId)) ?? "0-0";
      const abortController = new AbortController();
      streamAbortControllerRef.current = abortController;
      let streamFailedMessage: string | null = null;

      try {
        await chatStream({
          streamUrl: params.streamUrl,
          accessToken,
          lastEventId,
          signal: abortController.signal,
          onEvent: (event) => {
            if (event.id) {
              void saveLastStreamEventId(params.assistantMessageId, event.id);
            }

            if (
              event.event === "message.done" ||
              event.event === "message.aborted" ||
              (event.event === "error" && event.data.finalMessage)
            ) {
              void clearLastStreamEventId(params.assistantMessageId);
            }

            if (event.event === "error") {
              streamFailedMessage = event.data.message;
              setStreamError(event.data.message);
            }

            setStreamMessages((current) => {
              const baseMessages =
                current?.chatId === params.chatId ? current.messages : params.initialMessages;

              return {
                chatId: params.chatId,
                messages: applyStreamEvent(baseMessages, event),
              };
            });
          },
        });
      } catch (error) {
        if (!abortController.signal.aborted) {
          streamFailedMessage = extractApiError(error);
          setStreamError(streamFailedMessage);
        }
      } finally {
        if (streamAbortControllerRef.current === abortController) {
          streamAbortControllerRef.current = null;
        }
        setIsStreaming(false);
        setActiveStreamMessageId((current) =>
          current === params.assistantMessageId ? null : current,
        );
        await queryClient.invalidateQueries({ queryKey: ["chats", "list"] });
        await queryClient.invalidateQueries({ queryKey: ["chats", "messages", params.chatId] });
        await queryClient.refetchQueries({ queryKey: ["chats", "messages", params.chatId] });
        setStreamMessages((current) => (current?.chatId === params.chatId ? null : current));
      }

      if (streamFailedMessage) {
        Alert.alert("Streaming stopped", streamFailedMessage);
      }
    },
    [accessToken, queryClient],
  );

  useEffect(() => {
    if (!selectedChatId || !accessToken || !messagesQuery.data?.items?.length) {
      return;
    }
    if (isStreaming || activeStreamMessageId) {
      return;
    }

    const streamingMessage = messagesQuery.data.items.find(
      (message) => message.role === "assistant" && message.status === "streaming" && message.streamUrl,
    );
    if (!streamingMessage?.streamUrl) {
      return;
    }

    void consumeStream({
      chatId: selectedChatId,
      assistantMessageId: streamingMessage.id,
      streamUrl: streamingMessage.streamUrl,
      initialMessages: messagesQuery.data.items,
    });
  }, [accessToken, activeStreamMessageId, consumeStream, isStreaming, messagesQuery.data, selectedChatId]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) {
      Alert.alert("Add a prompt", "Ask a question or let the assistant summarize your cards.");
      return;
    }

    if (!accessToken) {
      Alert.alert("Session expired", "Please sign in again and retry.");
      return;
    }

    let chatId = selectedChatId;
    if (!chatId) {
      const chat = await createChatMutation.mutateAsync({ title: buildChatTitle(content) });
      chatId = chat.id;
      setDraftChatMode(false);
      setSelectedChatId(chat.id);
    }

    const initialMessages = selectedChatId === chatId ? messagesQuery.data?.items ?? [] : [];
    const optimisticUserMessage = buildOptimisticUserMessage({
      chatId,
      content,
      useKnowledge,
      useWebSearch,
    });

    setStreamError(null);
    setDraft("");

    setStreamMessages({
      chatId,
      messages: [...initialMessages, optimisticUserMessage],
    });

    try {
      const createResponse = await createChatMessage(chatId, {
        content,
        options: {
          useKnowledge,
          useWebSearch,
        },
      });

      setStreamMessages((current) => {
        if (current?.chatId !== chatId) {
          return current;
        }
        return {
          chatId,
          messages: current.messages.map((message) =>
            message.id === optimisticUserMessage.id
              ? {
                  ...message,
                  id: createResponse.userMessageId,
                }
              : message,
          ),
        };
      });

      await consumeStream({
        chatId,
        assistantMessageId: createResponse.assistantMessageId,
        streamUrl: createResponse.streamUrl,
        initialMessages: [...initialMessages, { ...optimisticUserMessage, id: createResponse.userMessageId }],
      });
    } catch (error) {
      const message = extractApiError(error);
      setIsStreaming(false);
      setActiveStreamMessageId(null);
      setStreamError(message);
      Alert.alert("Message failed", message);
      await queryClient.invalidateQueries({ queryKey: ["chats", "messages", chatId] });
      setStreamMessages((current) => (current?.chatId === chatId ? null : current));
    }
  };

  const handleAbort = async () => {
    if (!selectedChatId || !activeStreamMessageId) {
      return;
    }

    try {
      await abortChatMessage(selectedChatId, activeStreamMessageId);
    } catch (error) {
      Alert.alert("Abort failed", extractApiError(error));
    }
  };

  const isBusy = createChatMutation.isPending || isStreaming;

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Stage Two</Text>
        <Text style={styles.heroTitle}>Streaming Chat Workspace</Text>
        <Text style={styles.heroSubtitle}>
          The mobile app now creates a chat message first, resumes any active assistant stream from
          saved event IDs, and keeps the UI in sync with persisted message state.
        </Text>
      </View>

      <View style={styles.chatToolbar}>
        <PrimaryButton
          disabled={isBusy}
          label="New chat"
          onPress={() => {
            setDraftChatMode(true);
            setSelectedChatId(null);
            setDraft("");
            setStreamMessages(null);
            setStreamError(null);
          }}
          tone="secondary"
        />
        <PrimaryButton
          disabled={isBusy}
          label="Refresh"
          onPress={() => {
            void chatsQuery.refetch();
            if (selectedChatId) {
              void messagesQuery.refetch();
            }
          }}
          tone="secondary"
        />
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          disabled={isBusy}
          onPress={() => setUseKnowledge((value) => !value)}
          style={[styles.optionChip, useKnowledge && styles.optionChipActive]}
        >
          <Text style={[styles.optionChipLabel, useKnowledge && styles.optionChipLabelActive]}>
            Knowledge
          </Text>
        </Pressable>
        <Pressable
          disabled={isBusy}
          onPress={() => setUseWebSearch((value) => !value)}
          style={[styles.optionChip, useWebSearch && styles.optionChipActive]}
        >
          <Text style={[styles.optionChipLabel, useWebSearch && styles.optionChipLabelActive]}>
            Web search
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chatChipRow}
      >
        <Pressable
          disabled={isBusy}
          onPress={() => {
            setDraftChatMode(true);
            setSelectedChatId(null);
            setStreamMessages(null);
            setStreamError(null);
          }}
          style={[styles.chatChip, draftChatMode && styles.chatChipActive]}
        >
          <Text style={[styles.chatChipLabel, draftChatMode && styles.chatChipLabelActive]}>
            Draft
          </Text>
        </Pressable>
        {chatsQuery.data?.items.map((chat) => {
          const selected = chat.id === selectedChatId;
          return (
            <Pressable
              key={chat.id}
              disabled={isBusy}
              onPress={() => {
                setDraftChatMode(false);
                setSelectedChatId(chat.id);
                setStreamMessages(null);
                setStreamError(null);
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
        {chatsQuery.isLoading || (selectedChatId && messagesQuery.isLoading && !streamMessages) ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#163d33" size="large" />
            <Text style={styles.centerStateText}>Loading conversation...</Text>
          </View>
        ) : chatsQuery.isError ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateTitle}>Unable to load chats</Text>
            <Text style={styles.centerStateText}>{extractApiError(chatsQuery.error)}</Text>
          </View>
        ) : messagesQuery.isError ? (
          <View style={styles.centerState}>
            <Text style={styles.centerStateTitle}>Unable to load messages</Text>
            <Text style={styles.centerStateText}>{extractApiError(messagesQuery.error)}</Text>
          </View>
        ) : displayedMessages.length > 0 ? (
          <View style={styles.messageList}>
            {displayedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No messages yet</Text>
            <Text style={styles.emptyStateText}>
              Start with a focused question, or ask the assistant to summarize your knowledge cards.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chatComposer}>
        <Text style={styles.sectionTitle}>Ask a question</Text>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="Example: summarize the key ideas behind FastAPI routing from my library."
          placeholderTextColor={colors.placeholder}
          style={styles.chatInput}
          value={draft}
        />
        {streamError ? <Text style={styles.streamErrorText}>{streamError}</Text> : null}
        <PrimaryButton
          disabled={isBusy}
          label={isBusy ? "Streaming..." : "Send"}
          onPress={() => void handleSend()}
        />
        {isStreaming && selectedChatId && activeStreamMessageId ? (
          <PrimaryButton
            disabled={false}
            label="Abort generation"
            onPress={() => void handleAbort()}
            tone="secondary"
          />
        ) : null}
      </View>
    </ScrollView>
  );
}
