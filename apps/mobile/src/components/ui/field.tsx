import { Text, TextInput, View } from "react-native";

import { fieldStyles as styles } from "./field.styles";

export function Field(props: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        multiline={props.multiline}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        style={[styles.input, props.multiline && styles.inputMultiline]}
        value={props.value}
      />
    </View>
  );
}
