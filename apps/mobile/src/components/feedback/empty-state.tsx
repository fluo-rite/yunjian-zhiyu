import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import { emptyStateStyles as styles } from "@/components/feedback/empty-state.styles";

export function EmptyState(props: {
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.description}>{props.description}</Text>
      {props.actionLabel && props.onActionPress ? (
        <PrimaryButton label={props.actionLabel} onPress={props.onActionPress} variant="secondary" />
      ) : null}
    </View>
  );
}
