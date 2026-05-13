import { Text, View } from "react-native";

import { type Citation, type Message } from "@/lib/api";

import { messageBubbleStyles as styles } from "./message-bubble.styles";

function isCitationList(value: unknown): value is Citation[] {
  return Array.isArray(value);
}

export function MessageBubble(props: { message: Message }) {
  const isAssistant = props.message.role === "assistant";
  const citations = isCitationList(props.message.metadata?.citations)
    ? props.message.metadata?.citations
    : [];

  return (
    <View
      style={[
        styles.messageBubble,
        isAssistant ? styles.assistantMessageBubble : styles.userMessageBubble,
      ]}
    >
      <View style={styles.messageHeader}>
        <Text style={styles.messageRole}>{isAssistant ? "AI 助手" : "你"}</Text>
        {isAssistant && props.message.metadata?.model ? (
          <Text style={styles.messageMeta}>{props.message.metadata.model}</Text>
        ) : null}
      </View>

      <Text style={styles.messageContent}>{props.message.content}</Text>

      {citations.length > 0 ? (
        <View style={styles.citationList}>
          {citations.map((citation, index) => (
            <View key={`${props.message.id}-${citation.title}-${index}`} style={styles.citationCard}>
              <Text style={styles.citationType}>
                {citation.type === "knowledge_card" ? "知识卡片引用" : "外部来源引用"}
              </Text>
              <Text style={styles.citationTitle}>{citation.title}</Text>
              <Text style={styles.citationSnippet}>{citation.snippet}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
