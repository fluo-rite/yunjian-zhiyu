import { Modal, Pressable, Text, View } from "react-native";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { libraryCopy } from "../utils/library-copy";
import { sourceImportSheetStyles as styles } from "./source-import-sheet.styles";

export function SourceImportSheet(props: {
  visible: boolean;
  onClose: () => void;
  onImportText: () => void;
  onImportFile: () => void;
  onImportSession: () => void;
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
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>导入知识来源</Text>
            <Text style={styles.description}>选择你要整理成知识卡片的内容类型。</Text>
          </View>

          <View style={styles.actionList}>
            <PrimaryButton
              iconName="document-text-outline"
              label={libraryCopy.sourceList.importTextAction}
              onPress={props.onImportText}
            />
            <PrimaryButton
              iconName="document-attach-outline"
              label={libraryCopy.sourceList.importFileAction}
              onPress={props.onImportFile}
              variant="secondary"
            />
            <PrimaryButton
              iconName="chatbubbles-outline"
              label={libraryCopy.sourceList.importSessionAction}
              onPress={props.onImportSession}
              variant="secondary"
            />
            <PrimaryButton label="我知道了" onPress={props.onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
