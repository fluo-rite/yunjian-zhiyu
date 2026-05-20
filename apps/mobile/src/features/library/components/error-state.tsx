import { Text, View } from "react-native";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { errorStateStyles as styles } from "./error-state.styles";

export function ErrorState(props: {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.description}>{props.description}</Text>
      {props.retryLabel && props.onRetry ? (
        <PrimaryButton label={props.retryLabel} onPress={props.onRetry} />
      ) : null}
    </View>
  );
}
