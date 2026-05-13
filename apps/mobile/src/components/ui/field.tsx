import { Text, TextInput, View } from "react-native";

import { colors } from "@/theme/tokens";

import { fieldStyles as styles } from "./field.styles";

export function Field(props: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        multiline={props.multiline}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.placeholder}
        secureTextEntry={props.secureTextEntry}
        style={[styles.input, props.multiline && styles.inputMultiline]}
        value={props.value}
      />
    </View>
  );
}
