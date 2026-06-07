import { FlashList } from "@shopify/flash-list";
import { memo, useMemo } from "react";
import { Text, View } from "react-native";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { ChatMessageItem } from "@/features/sessions/chat/components/chat-message-item";
import { type Message } from "@/features/sessions/api";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
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
  streamConnectionState?: "idle" | "connecting" | "streaming" | "reconnecting" | "terminal" | "interrupted";
  streamErrorMessage?: string | null;
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  rangeStartMessageId?: string | null;
  rangeEndMessageId?: string | null;
  onToggleSelect?: (message: Message) => void;
  onRetryStream?: () => void;
  onRefreshMessages?: () => void;
};

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
  streamConnectionState,
  streamErrorMessage,
  selectionMode,
  selectedIds,
  rangeStartMessageId,
  rangeEndMessageId,
  onToggleSelect,
  onRetryStream,
  onRefreshMessages,
}: ChatMessageListProps) {
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
      streamConnectionState,
      streamErrorMessage,
      selectionMode,
      selectedIds,
      rangeStartMessageId,
      rangeEndMessageId,
      onRetryStream,
      onRefreshMessages,
    }),
    [
      composerSpacerHeight,
      ephemeralPhaseLabel,
      errorMessage,
      isError,
      isLoading,
      onRefreshMessages,
      onRetryStream,
      selectedIds,
      selectionMode,
      streamConnectionState,
      streamErrorMessage,
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
      maintainVisibleContentPosition={{
        startRenderingFromBottom: true,
        autoscrollToBottomThreshold: 0.2,
      }}
      renderItem={({ item }) => {
        const isCurrentStreamTarget = item.id === streamAssistantMessageId;
        const renderedMessage =
          isCurrentStreamTarget && terminalMessage
            ? terminalMessage
            : isCurrentStreamTarget && streamedContent
              ? { ...item, content: streamedContent }
              : item;
        const interruptionLabel =
          isCurrentStreamTarget && streamConnectionState === "interrupted"
            ? streamErrorMessage || sessionCopy.chat.streamReconnectInterruptedLabel
            : null;

        return (
          <ChatMessageItem
            ephemeralStatusLabel={isCurrentStreamTarget ? ephemeralPhaseLabel : null}
            interruptionLabel={interruptionLabel}
            message={renderedMessage}
            onRefreshMessages={isCurrentStreamTarget ? onRefreshMessages : undefined}
            onPress={
              selectionMode && onToggleSelect
                ? () => {
                    onToggleSelect(renderedMessage);
                  }
                : undefined
            }
            onRetryStream={isCurrentStreamTarget ? onRetryStream : undefined}
            selectionLabel={getSelectionLabel(renderedMessage.id)}
            selected={selectedIds?.has(renderedMessage.id) ?? false}
            selectionMode={selectionMode}
            showReconnectActions={Boolean(interruptionLabel)}
          />
        );
      }}
      showsVerticalScrollIndicator={false}
      style={styles.list}
    />
  );
}

export const ChatMessageList = memo(ChatMessageListComponent);
