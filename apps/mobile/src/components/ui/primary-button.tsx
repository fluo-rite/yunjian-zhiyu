import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

type ButtonTone = "primary" | "secondary" | "danger";

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  style?: StyleProp<ViewStyle>;
}) {
  const toneStyle = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    danger: styles.dangerButton,
  }[props.tone ?? "primary"];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        toneStyle,
        props.style,
        props.disabled && styles.buttonDisabled,
        pressed && !props.disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  primaryButton: {
    backgroundColor: "#1f5c49",
  },
  secondaryButton: {
    backgroundColor: "#d7c4a3",
  },
  dangerButton: {
    backgroundColor: "#a34539",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
