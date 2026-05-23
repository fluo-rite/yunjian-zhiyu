import { Modal, Pressable, Text, View } from "react-native";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { sessionImportHintModalStyles as styles } from "./session-import-hint-modal.styles";

export function SessionImportHintModal(props: {
  visible: boolean;
  onClose: () => void;
  onGoToSessions: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={props.onClose}
      transparent
      visible={props.visible}
    >
      <View style={styles.backdrop}>
        <Pressable onPress={props.onClose} style={styles.backdropDismiss} />

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>请在聊天页中选择消息</Text>
            <Text style={styles.description}>
              会话内容导入需要在聊天页中进行。请前往会话页，进入对应聊天后点击右上角“选取消息”来导入。
            </Text>
          </View>

          <View style={styles.actionList}>
            <PrimaryButton label="前往会话页" onPress={props.onGoToSessions} />
            <PrimaryButton label="我知道了" onPress={props.onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
