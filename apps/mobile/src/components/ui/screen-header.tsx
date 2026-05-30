import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, Text, View } from "react-native";

import { screenHeaderStyles as styles } from "@/components/ui/screen-header.styles";

export function ScreenHeader(props: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.header}>
      {props.onBack ? (
        <Pressable
          accessibilityLabel="返回"
          accessibilityRole="button"
          onPress={props.onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons color="#0F172A" name="chevron-back" size={22} />
        </Pressable>
      ) : (
        <View style={styles.sidePlaceholder} />
      )}

      <View style={styles.center}>
        {props.subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {props.subtitle}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={styles.title}>
          {props.title}
        </Text>
      </View>

      {props.rightLabel ? (
        <Pressable
          accessibilityLabel={props.rightLabel}
          accessibilityRole="button"
          onPress={props.onRightPress}
          style={({ pressed }) => [styles.rightAction, pressed && styles.rightActionPressed]}
        >
          <Text numberOfLines={1} style={styles.rightActionText}>
            {props.rightLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.sidePlaceholder} />
      )}
    </View>
  );
}
