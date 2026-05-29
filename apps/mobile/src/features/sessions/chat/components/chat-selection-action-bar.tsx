import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import { chatSelectionActionBarStyles as styles } from "@/features/sessions/chat/components/chat-selection-action-bar.styles";

export function ChatSelectionActionBar(props: {
  selectedCount: number;
  rangeStatus: "idle" | "pending_end" | "complete";
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const title =
    props.rangeStatus === "idle"
      ? sessionCopy.chat.selectionIdleTitle
      : props.rangeStatus === "pending_end"
        ? sessionCopy.chat.selectionPendingEndTitle
        : `已�?${props.selectedCount} 条消息`;
  const description =
    props.rangeStatus === "idle"
      ? sessionCopy.chat.selectionIdleDescription
      : props.rangeStatus === "pending_end"
        ? sessionCopy.chat.selectionPendingEndDescription
        : sessionCopy.chat.selectionReadyDescription;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.actionRow}>
        <PrimaryButton label={sessionCopy.chat.cancelAction} onPress={props.onCancel} variant="secondary" />
        <PrimaryButton
          disabled={props.rangeStatus !== "complete" || props.selectedCount === 0 || props.isSubmitting}
          label={
            props.isSubmitting
              ? sessionCopy.chat.selectionSubmittingAction
              : sessionCopy.chat.selectionSubmitAction
          }
          onPress={props.onSubmit}
        />
      </View>
    </View>
  );
}

