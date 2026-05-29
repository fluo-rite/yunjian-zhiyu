import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { memo, useEffect, useMemo, useRef } from "react";
import { Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { type Message } from "@/features/sessions/api";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import { ChatMessageItem } from "@/features/sessions/chat/components/chat-message-item";
import { chatMessageListStyles as styles } from "@/features/sessions/chat/components/chat-message-list.styles";

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
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  rangeStartMessageId?: string | null;
  rangeEndMessageId?: string | null;
  onToggleSelect?: (message: Message) => void;
};

const BOTTOM_STICKY_THRESHOLD = 80;
const AUTO_SCROLL_INTERVAL_MS = 100;

function ListSeparator() {
  return <View style={styles.itemSeparator} />;
}

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
  selectionMode,
  selectedIds,
  rangeStartMessageId,
  rangeEndMessageId,
  onToggleSelect,
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
      selectionMode,
      selectedIds,
      rangeStartMessageId,
      rangeEndMessageId,
    }),
    [
      composerSpacerHeight,
      ephemeralPhaseLabel,
      errorMessage,
      isError,
      isLoading,
      selectedIds,
      selectionMode,
      streamAssistantMessageId,
      streamedContent,
      terminalMessage,
      rangeStartMessageId,
      rangeEndMessageId,
    ],
  );

  function getSelectionLabel(messageId: string) {
    if (!selectionMode) {
      return null;
    }

    const isStart = rangeStartMessageId === messageId;
    const isEnd = rangeEndMessageId === messageId;
    const isSelected = selectedIds?.has(messageId) ?? false;

    if (isStart && isEnd) {
      return sessionCopy.chat.selectionSingleItemLabel;
    }

    if (isStart) {
      return sessionCopy.chat.selectionStartItemLabel;
    }

    if (isEnd) {
      return sessionCopy.chat.selectionEndItemLabel;
    }

    if (isSelected) {
      return sessionCopy.chat.selectionRangeItemLabel;
    }

    if (!rangeStartMessageId) {
      return sessionCopy.chat.selectionStartPromptLabel;
    }

    if (!rangeEndMessageId) {
      return sessionCopy.chat.selectionEndPromptLabel;
    }

    return sessionCopy.chat.selectionRestartPromptLabel;
  }

  function cancelScheduledAutoScroll() {
    if (scrollTimerRef.current === null) {
      return;
    }

    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = null;
  }

  useEffect(() => {
    if (!isNearBottomRef.current) {
      return;
    }

    if (!selectionMode && scrollTimerRef.current === null) {
      scrollTimerRef.current = setTimeout(() => {
        scrollTimerRef.current = null;
        listRef.current?.scrollToEnd({ animated: messages.length > 0 });
      }, AUTO_SCROLL_INTERVAL_MS);
    }

    return () => {
      cancelScheduledAutoScroll();
    };
  }, [
    composerSpacerHeight,
    lastMessage?.content,
    lastMessage?.id,
    messages.length,
    selectionMode,
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
            <Text style={styles.welcomeTitle}>{sessionCopy.chat.welcomeTitle}</Text>
            <Text style={styles.welcomeText}>{sessionCopy.chat.welcomeDescription}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <EmptyState
            description={sessionCopy.chat.loadingDescription}
            title={sessionCopy.chat.loadingTitle}
          />
        ) : null}

        {isError ? (
          <ErrorState
            description={errorMessage || sessionCopy.chat.errorDescription}
            title={sessionCopy.chat.errorTitle}
          />
        ) : null}
      </View>
    );
  }, [errorMessage, isError, isLoading, messages.length]);

  return (
    <FlashList
      contentContainerStyle={styles.contentContainer}
      data={messages}
      extraData={listExtraData}
      ItemSeparatorComponent={ListSeparator}
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
            onPress={
              selectionMode && onToggleSelect
                ? () => {
                    onToggleSelect(renderedMessage);
                  }
                : undefined
            }
            selectionLabel={getSelectionLabel(renderedMessage.id)}
            selected={selectedIds?.has(renderedMessage.id) ?? false}
            selectionMode={selectionMode}
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

