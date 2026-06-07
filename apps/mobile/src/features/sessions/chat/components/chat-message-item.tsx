import { memo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { type Citation, type Message } from "@/features/sessions/api";
import { ChatMessageMarkdownBody } from "@/features/sessions/chat/components/chat-message-markdown-body";
import { chatMessageItemStyles as styles } from "@/features/sessions/chat/components/chat-message-item.styles";

export type ChatMessageItemProps = {
  message: Message;
  renderMode?: "plain" | "markdown";
  ephemeralStatusLabel?: string | null;
  interruptionLabel?: string | null;
  showReconnectActions?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  selectionLabel?: string | null;
  onPress?: () => void;
  onRetryStream?: () => void;
  onRefreshMessages?: () => void;
};

function getCitationTypeLabel(citation: Citation) {
  return citation.type === "web" ? "网页来源" : "知识卡片";
}

function getCitationKey(messageId: string, citation: Citation) {
  if (citation.sourceId) {
    return `${messageId}:${citation.type}:${citation.sourceId}`;
  }

  if (citation.url) {
    return `${messageId}:${citation.type}:${citation.url}`;
  }

  return `${messageId}:${citation.type}:${citation.title}:${citation.snippet}`;
}

function ChatMessageItemComponent({
  message,
  renderMode,
  ephemeralStatusLabel,
  interruptionLabel,
  showReconnectActions,
  selectionMode,
  selected,
  selectionLabel,
  onPress,
  onRetryStream,
  onRefreshMessages,
}: ChatMessageItemProps) {
  const [isCitationModalVisible, setIsCitationModalVisible] = useState(false);
  const isUser = message.role === "user";
  const shouldRenderMarkdown = renderMode ? renderMode === "markdown" : !isUser;
  const citations = !isUser ? message.metadata?.citations ?? [] : [];
  const assistantContent = !isUser ? message.content : "";

  const assistantFallbackText =
    !assistantContent &&
    message.status === "streaming" &&
    !ephemeralStatusLabel &&
    !interruptionLabel
      ? "正在生成回复…"
      : null;

  const canOpenCitation = !selectionMode && !isUser && citations.length > 0;
  const rowContent = (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={styles.bubbleWrap}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            selectionMode && selected ? styles.bubbleSelected : null,
          ]}
        >
          {shouldRenderMarkdown ? (
            assistantContent ? <ChatMessageMarkdownBody content={assistantContent} /> : null
          ) : (
            <Text style={[styles.userText, selectionMode && selected ? styles.userTextSelected : null]}>
              {message.content}
            </Text>
          )}

          {!isUser && assistantFallbackText ? <Text style={styles.statusText}>{assistantFallbackText}</Text> : null}
          {!isUser && ephemeralStatusLabel ? <Text style={styles.streamingStatusText}>{ephemeralStatusLabel}</Text> : null}
          {!isUser && interruptionLabel ? <Text style={styles.errorText}>{interruptionLabel}</Text> : null}
          {!isUser && message.status === "failed" ? (
            <Text style={styles.errorText}>{message.errorMessage || "这次回复没有成功完成。"}</Text>
          ) : null}
          {!isUser && message.status === "aborted" ? <Text style={styles.statusText}>本次生成已停止。</Text> : null}
        </View>

        {selectionMode && selectionLabel ? (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionIndicatorText}>{selectionLabel}</Text>
          </View>
        ) : null}

        {canOpenCitation ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsCitationModalVisible(true)}
            style={({ pressed }) => [styles.citationTrigger, pressed && styles.citationTriggerPressed]}
          >
            <Text style={styles.citationTriggerText}>查看引用内容</Text>
          </Pressable>
        ) : null}

        {!selectionMode && showReconnectActions ? (
          <View style={styles.reconnectActionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onRetryStream}
              style={({ pressed }) => [styles.reconnectAction, pressed && styles.citationTriggerPressed]}
            >
              <Text style={styles.citationTriggerText}>重试继续接收</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onRefreshMessages}
              style={({ pressed }) => [styles.reconnectAction, pressed && styles.citationTriggerPressed]}
            >
              <Text style={styles.citationTriggerText}>刷新消息</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <>
      {selectionMode ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.rowSelectable, pressed ? styles.rowSelectablePressed : null]}
        >
          {rowContent}
        </Pressable>
      ) : (
        rowContent
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setIsCitationModalVisible(false)}
        transparent
        visible={isCitationModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable onPress={() => setIsCitationModalVisible(false)} style={styles.modalBackdropDismiss} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>引用内容</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => setIsCitationModalVisible(false)}
                style={({ pressed }) => [styles.modalCloseButton, pressed && styles.modalCloseButtonPressed]}
              >
                <Text style={styles.modalCloseText}>关闭</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {citations.map((citation) => (
                <View key={getCitationKey(message.id, citation)} style={styles.citationCard}>
                  <Text style={styles.citationMeta}>{getCitationTypeLabel(citation)}</Text>
                  <Text style={styles.citationTitle}>{citation.title}</Text>
                  <Text style={styles.citationSnippet}>{citation.snippet}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export const ChatMessageItem = memo(ChatMessageItemComponent);
