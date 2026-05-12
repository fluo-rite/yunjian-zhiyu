import { Text, TextInput, View } from "react-native";

import { homeStyles as styles } from "@/features/home/styles";

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
        placeholderTextColor="#7f8c8d"
        secureTextEntry={props.secureTextEntry}
        style={[styles.input, props.multiline && styles.inputMultiline]}
        value={props.value}
      />
    </View>
  );
}
