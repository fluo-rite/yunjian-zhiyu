import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import { chatSelectionActionBarStyles as styles } from "@/features/sessions/components/chat-selection-action-bar.styles";

export function ChatSelectionActionBar(props: {
  selectedCount: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>已选 {props.selectedCount} 条消息</Text>
        <Text style={styles.description}>选中你想沉淀的聊天内容，然后导入为知识来源。</Text>
      </View>

      <View style={styles.actionRow}>
        <PrimaryButton label="取消" onPress={props.onCancel} variant="secondary" />
        <PrimaryButton
          disabled={props.selectedCount === 0 || props.isSubmitting}
          label={props.isSubmitting ? "导入中…" : "导入为知识来源"}
          onPress={props.onSubmit}
        />
      </View>
    </View>
  );
}
