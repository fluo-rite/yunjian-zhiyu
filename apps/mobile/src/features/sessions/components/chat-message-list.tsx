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
  phaseLabel?: string | null;
  composerSpacerHeight: number;
};

const ESTIMATED_ITEM_SIZE = 180;
const BOTTOM_STICKY_THRESHOLD = 120;

function ChatMessageListComponent({
  messages,
  isLoading,
  isError,
  errorMessage,
  phaseLabel,
  composerSpacerHeight,
}: ChatMessageListProps) {
  const listRef = useRef<FlashListRef<Message> | null>(null);
  const isNearBottomRef = useRef(true);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    const shouldStickToBottom =
      isNearBottomRef.current || (lastMessage?.role === "assistant" && lastMessage.status === "streaming");

    if (!shouldStickToBottom) {
      return;
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: messages.length > 0 });
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [
    composerSpacerHeight,
    lastMessage?.content,
    lastMessage?.id,
    lastMessage?.role,
    lastMessage?.status,
    messages.length,
    phaseLabel,
  ]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    isNearBottomRef.current = distanceFromBottom < BOTTOM_STICKY_THRESHOLD;
  }

  const listHeaderComponent = useMemo(() => {
    const showWelcomeCard = messages.length === 0 && !isLoading && !isError && !phaseLabel;

    if (!showWelcomeCard && !isLoading && !isError && !phaseLabel) {
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

        {phaseLabel ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>当前状态</Text>
            <Text style={styles.statusText}>{phaseLabel}</Text>
          </View>
        ) : null}
      </View>
    );
  }, [errorMessage, isError, isLoading, messages.length, phaseLabel]);

  return (
    <FlashList
      contentContainerStyle={styles.contentContainer}
      data={messages}
      estimatedItemSize={ESTIMATED_ITEM_SIZE}
      extraData={{
        composerSpacerHeight,
        errorMessage,
        isError,
        isLoading,
        phaseLabel,
      }}
      ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListFooterComponent={<View style={[styles.footerSpacer, { height: composerSpacerHeight }]} />}
      ListHeaderComponent={listHeaderComponent}
      onScroll={handleScroll}
      ref={listRef}
      renderItem={({ item }) => <ChatMessageItem message={item} />}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={styles.list}
    />
  );
}

export const ChatMessageList = memo(ChatMessageListComponent);
