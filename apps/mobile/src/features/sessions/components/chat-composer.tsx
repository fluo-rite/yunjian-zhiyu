import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useEffect, useState } from "react";
import {
  Pressable,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from "react-native";

import { colors } from "@/theme/tokens";
import { chatComposerStyles as styles } from "@/features/sessions/components/chat-composer.styles";

const MIN_INPUT_HEIGHT = 24;
const MAX_INPUT_HEIGHT = 120;

export function ChatComposer(props: {
  onSend: (text: string) => void | Promise<void>;
  onAbort: () => void | Promise<void>;
  isSending: boolean;
  isStreaming: boolean;
  isAborting: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  useEffect(() => {
    if (!draft) {
      setInputHeight(MIN_INPUT_HEIGHT);
    }
  }, [draft]);

  const canSend = Boolean(draft.trim()) && !props.isSending && !props.isStreaming;
  const isActionDisabled = props.isStreaming ? props.isAborting : !canSend;
  const actionLabel = props.isStreaming ? "停止生成" : "发送消息";

  function handleContentSizeChange(event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) {
    const nextHeight = Math.max(
      MIN_INPUT_HEIGHT,
      Math.min(MAX_INPUT_HEIGHT, Math.ceil(event.nativeEvent.contentSize.height)),
    );
    setInputHeight(nextHeight);
  }

  async function handleSendPress() {
    const text = draft.trim();

    if (!text || props.isSending || props.isStreaming) {
      return;
    }

    setDraft("");
    await props.onSend(text);
  }

  return (
    <View style={styles.shell}>
      <TextInput
        multiline
        onChangeText={setDraft}
        onContentSizeChange={handleContentSizeChange}
        placeholder="输入你的问题或想整理的内容"
        placeholderTextColor={colors.textTertiary}
        scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
        style={[styles.input, { height: inputHeight }]}
        textAlignVertical="top"
        value={draft}
      />

      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        disabled={isActionDisabled}
        onPress={props.isStreaming ? props.onAbort : handleSendPress}
        style={({ pressed }) => [
          styles.action,
          props.isStreaming ? styles.actionSecondary : styles.actionPrimary,
          isActionDisabled && styles.actionDisabled,
          pressed && !isActionDisabled && styles.actionPressed,
        ]}
      >
        <Ionicons
          color={props.isStreaming ? colors.textPrimary : colors.textOnAccent}
          name={props.isStreaming ? "stop" : "arrow-up"}
          size={18}
        />
      </Pressable>
    </View>
  );
}
