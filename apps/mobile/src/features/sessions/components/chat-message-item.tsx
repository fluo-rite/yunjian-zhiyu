import { memo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { type Citation, type Message } from "../api";
import { ChatMessageMarkdownBody } from "./chat-message-markdown-body";
import { chatMessageItemStyles as styles } from "./chat-message-item.styles";

export type ChatMessageItemProps = {
  message: Message;
  renderMode?: "plain" | "markdown";
};

function getCitationTypeLabel(citation: Citation) {
  return citation.type === "web" ? "网页来源" : "知识卡片";
}

function ChatMessageItemComponent({ message, renderMode }: ChatMessageItemProps) {
  const [isCitationModalVisible, setIsCitationModalVisible] = useState(false);
  const isUser = message.role === "user";
  const shouldRenderMarkdown = renderMode ? renderMode === "markdown" : !isUser;
  const citations = !isUser ? message.metadata?.citations ?? [] : [];
  const assistantContent = message.content || (message.status === "streaming" ? "正在生成回复…" : "");

  return (
    <>
      <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
        <View style={styles.bubbleWrap}>
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
            {shouldRenderMarkdown ? (
              assistantContent ? <ChatMessageMarkdownBody content={assistantContent} /> : null
            ) : (
              <Text style={styles.userText}>{message.content}</Text>
            )}

            {!isUser && message.status === "failed" ? (
              <Text style={styles.errorText}>{message.errorMessage || "这次回复没有成功完成。"}</Text>
            ) : null}

            {!isUser && message.status === "aborted" ? (
              <Text style={styles.statusText}>本次生成已停止。</Text>
            ) : null}
          </View>

          {!isUser && citations.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsCitationModalVisible(true);
              }}
              style={({ pressed }) => [styles.citationTrigger, pressed && styles.citationTriggerPressed]}
            >
              <Text style={styles.citationTriggerText}>查看引用内容</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setIsCitationModalVisible(false);
        }}
        transparent
        visible={isCitationModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            onPress={() => {
              setIsCitationModalVisible(false);
            }}
            style={styles.modalBackdropDismiss}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>引用内容</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsCitationModalVisible(false);
                }}
                style={({ pressed }) => [styles.modalCloseButton, pressed && styles.modalCloseButtonPressed]}
              >
                <Text style={styles.modalCloseText}>关闭</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              {citations.map((citation, index) => (
                <View key={`${message.id}-${citation.title}-${index}`} style={styles.citationCard}>
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
