import { Text, View } from "react-native";

import { screenHeaderStyles as styles } from "./screen-header.styles";
import { PrimaryButton } from "./primary-button";

export function ScreenHeader(props: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <PrimaryButton
        label="返回"
        onPress={props.onBack}
        style={styles.sideButton}
        variant="secondary"
      />

      <View style={styles.center}>
        {props.subtitle ? <Text style={styles.subtitle}>{props.subtitle}</Text> : null}
        <Text style={styles.title}>{props.title}</Text>
      </View>

      {props.rightLabel ? (
        <PrimaryButton
          label={props.rightLabel}
          onPress={props.onRightPress}
          style={styles.sideButton}
          variant="secondary"
        />
      ) : (
        <View style={styles.sidePlaceholder} />
      )}
    </View>
  );
}
