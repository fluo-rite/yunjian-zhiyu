import { Ionicons, type IoniconsIconName } from "@react-native-vector-icons/ionicons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

export function PrimaryButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "secondary";
  iconName?: IoniconsIconName;
}) {
  const variant = props.variant ?? "primary";
  const iconColor = variant === "secondary" ? colors.textPrimary : colors.textOnAccent;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        props.style,
        props.disabled && styles.disabled,
        pressed && !props.disabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {props.iconName ? <Ionicons color={iconColor} name={props.iconName} size={18} /> : null}
        <Text style={[styles.label, variant === "secondary" && styles.labelSecondary]}>
          {props.label}
        </Text>
      </View>
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
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
