import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { memo, useEffect, useMemo, useRef } from "react";
import { Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { type Message } from "../api";
import { ChatMessageItem } from "./chat-message-item";
import { chatMessageListStyles as styles } from "./chat-message-list.styles";

export type ChatMessageListProps = {
  messages: Message[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  composerSpacerHeight: number;
  streamAssistantMessageId?: string | null;
  streamedContent?: string;
  terminalMessage?: Message | null;
  ephemeralPhaseLabel?: string | null;
};

const ESTIMATED_ITEM_SIZE = 180;
const BOTTOM_STICKY_THRESHOLD = 120;
const AUTO_SCROLL_INTERVAL_MS = 100;

function ChatMessageListComponent({
  messages,
  isLoading,
  isError,
  errorMessage,
  composerSpacerHeight,
  streamAssistantMessageId,
  streamedContent,
  terminalMessage,
  ephemeralPhaseLabel,
}: ChatMessageListProps) {
  const listRef = useRef<FlashListRef<Message> | null>(null);
  const isNearBottomRef = useRef(true);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessage = messages[messages.length - 1];

  const listExtraData = useMemo(
    () => ({
      composerSpacerHeight,
      errorMessage,
      isError,
      isLoading,
      streamAssistantMessageId,
      streamedContent,
      terminalMessage,
      ephemeralPhaseLabel,
    }),
    [
      composerSpacerHeight,
      ephemeralPhaseLabel,
      errorMessage,
      isError,
      isLoading,
      streamAssistantMessageId,
      streamedContent,
      terminalMessage,
    ],
  );

  function cancelScheduledAutoScroll() {
    if (scrollTimerRef.current === null) {
      return;
    }

    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = null;
  }

  function scheduleAutoScroll() {
    if (scrollTimerRef.current !== null) {
      return;
    }

    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
      listRef.current?.scrollToEnd({ animated: messages.length > 0 });
    }, AUTO_SCROLL_INTERVAL_MS);
  }

  useEffect(() => {
    if (!isNearBottomRef.current) {
      return;
    }

    scheduleAutoScroll();

    return () => {
      cancelScheduledAutoScroll();
    };
  }, [
    composerSpacerHeight,
    lastMessage?.content,
    lastMessage?.id,
    messages.length,
    streamedContent,
    terminalMessage,
  ]);

  useEffect(() => {
    return () => {
      cancelScheduledAutoScroll();
    };
  }, []);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    isNearBottomRef.current = distanceFromBottom < BOTTOM_STICKY_THRESHOLD;
  }

  const listHeaderComponent = useMemo(() => {
    const showWelcomeCard = messages.length === 0 && !isLoading && !isError;

    if (!showWelcomeCard && !isLoading && !isError) {
      return null;
    }

    return (
      <View style={styles.listHeader}>
        {showWelcomeCard ? (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>开始新的对话</Text>
            <Text style={styles.welcomeText}>输入你的问题、想法，或者想整理的内容。</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>正在加载会话</Text>
            <Text style={styles.infoText}>请稍候，我们正在同步当前对话内容。</Text>
          </View>
        ) : null}

        {isError ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>消息加载失败</Text>
            <Text style={styles.infoText}>{errorMessage || "请稍后再试。"}</Text>
          </View>
        ) : null}
      </View>
    );
  }, [errorMessage, isError, isLoading, messages.length]);

  return (
    <FlashList
      contentContainerStyle={styles.contentContainer}
      data={messages}
      estimatedItemSize={ESTIMATED_ITEM_SIZE}
      extraData={listExtraData}
      ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListFooterComponent={<View style={[styles.footerSpacer, { height: composerSpacerHeight }]} />}
      ListHeaderComponent={listHeaderComponent}
      onScroll={handleScroll}
      ref={listRef}
      renderItem={({ item }) => {
        const isCurrentStreamTarget = item.id === streamAssistantMessageId;
        const renderedMessage =
          isCurrentStreamTarget && terminalMessage
            ? terminalMessage
            : isCurrentStreamTarget && streamedContent
              ? { ...item, content: streamedContent }
              : item;

        return (
          <ChatMessageItem
            ephemeralStatusLabel={isCurrentStreamTarget ? ephemeralPhaseLabel : null}
            message={renderedMessage}
          />
        );
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={styles.list}
    />
  );
}

export const ChatMessageList = memo(ChatMessageListComponent);
