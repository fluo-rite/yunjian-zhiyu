import { Text, View } from "react-native";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { selectionFooterStyles as styles } from "./selection-footer.styles";

export function SelectionFooter(props: {
  selectedCount: number;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.title}>已选 {props.selectedCount} 张卡片</Text>
          <Text style={styles.description}>确认后会把这些卡片加入当前分组。</Text>
        </View>

        <View style={styles.actions}>
          {props.secondaryLabel && props.onSecondaryPress ? (
            <PrimaryButton
              label={props.secondaryLabel}
              onPress={props.onSecondaryPress}
              variant="secondary"
            />
          ) : null}
          <PrimaryButton
            disabled={props.confirmDisabled}
            label={props.confirmLabel}
            onPress={props.onConfirm}
          />
        </View>
      </View>
    </View>
  );
}
