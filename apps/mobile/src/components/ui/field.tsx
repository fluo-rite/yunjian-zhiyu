import { Text, TextInput, View } from "react-native";

import { colors } from "../../theme/tokens";
import { fieldStyles as styles } from "./field.styles";

export function Field(props: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        autoCapitalize={props.autoCapitalize}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={props.secureTextEntry}
        style={[styles.input, props.multiline && styles.inputMultiline]}
        value={props.value}
      />
    </View>
  );
}
