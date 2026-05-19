import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";

export function PrimaryButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "secondary";
}) {
  const variant = props.variant ?? "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        props.style,
        props.disabled && styles.disabled,
        pressed && !props.disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, variant === "secondary" && styles.labelSecondary]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.textOnAccent,
    fontSize: typography.body,
    fontWeight: "700",
  },
  labelSecondary: {
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }],
  },
});
