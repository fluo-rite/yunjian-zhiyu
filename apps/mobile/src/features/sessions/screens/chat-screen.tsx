import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { type SessionsStackParamList } from "../../../navigation/types";
import { chatScreenStyles as styles } from "./chat-screen.styles";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const starterMessages: Message[] = [
  {
    id: "assistant-1",
    role: "assistant",
    text: "这里先做聊天详情页骨架。后续会接消息流、输入状态和真实会话历史。",
  },
  {
    id: "user-1",
    role: "user",
    text: "先把页面结构和交互骨架跑通，后面再接真实接口。",
  },
];

export function ChatScreen({
  navigation,
  route,
}: NativeStackScreenProps<SessionsStackParamList, "Chat">) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(
    route.params.isNew ? starterMessages.slice(0, 1) : starterMessages,
  );

  const screenSubtitle = useMemo(() => {
    return route.params.isNew ? "新的会话草稿" : "会话详情";
  }, [route.params.isNew]);

  function handleSend() {
    if (!draft.trim()) {
      return;
    }

    const nextUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: draft.trim(),
    };

    const nextAssistantMessage: Message = {
      id: `assistant-${Date.now() + 1}`,
      role: "assistant",
      text: "这里先用静态回复占位，后续会接入真实流式消息与会话持久化。",
    };

    setMessages((current) => [...current, nextUserMessage, nextAssistantMessage]);
    setDraft("");
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View style={styles.header}>
        <PrimaryButton
          label="返回"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          variant="secondary"
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>{screenSubtitle}</Text>
          <Text style={styles.headerTitle}>{route.params.title}</Text>
        </View>
        <PrimaryButton
          label="新会话"
          onPress={() =>
            navigation.replace("Chat", {
              chatId: `draft-${Date.now()}`,
              title: "新会话",
              isNew: true,
            })
          }
          style={styles.headerButton}
          variant="secondary"
        />
      </View>

      <ScrollView contentContainerStyle={styles.messages}>
        {route.params.isNew ? (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>开始新的思路整理</Text>
            <Text style={styles.welcomeText}>
              这里后续会放欢迎态、推荐提问和最近知识内容关联建议。
            </Text>
          </View>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <View
              key={message.id}
              style={[styles.bubbleRow, isUser ? styles.bubbleRight : styles.bubbleLeft]}
            >
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={styles.bubbleRole}>{isUser ? "你" : "AI 助手"}</Text>
                <Text style={styles.bubbleText}>{message.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <Field
            label="输入内容"
            multiline
            onChangeText={setDraft}
            placeholder="输入你想继续讨论的问题或整理目标"
            value={draft}
          />
          <View style={styles.actions}>
            <PrimaryButton disabled={!draft.trim()} label="发送" onPress={handleSend} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
