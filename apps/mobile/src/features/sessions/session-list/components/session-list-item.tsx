import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/tokens";
import { type Session } from "@/features/sessions/api";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import { formatSessionUpdatedTime } from "@/features/sessions/utils/session-helpers";
import { sessionListItemStyles as styles } from "@/features/sessions/session-list/components/session-list-item.styles";

export function SessionListItem(props: {
  session: Session;
  isMenuOpen: boolean;
  isDeleting: boolean;
  onPress: () => void;
  onToggleMenu: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.card,
        props.isMenuOpen ? styles.cardMenuOpen : null,
        pressed && !props.isMenuOpen ? styles.cardPressed : null,
      ]}
    >
      {props.isMenuOpen ? (
        <Pressable
          accessibilityRole="button"
          disabled={props.isDeleting}
          onPress={(event) => {
            event.stopPropagation();
            props.onDelete();
          }}
          style={({ pressed }) => [
            styles.deleteMenu,
            pressed && !props.isDeleting ? styles.deleteMenuPressed : null,
            props.isDeleting ? styles.deleteMenuDisabled : null,
          ]}
        >
          <Text style={styles.deleteMenuText}>
            {props.isDeleting
              ? sessionCopy.sessionList.deletePendingAction
              : sessionCopy.sessionList.deleteAction}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {props.session.title}
        </Text>
        <Text style={styles.cardTime}>{formatSessionUpdatedTime(props.session.updatedAt)}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Pressable
          accessibilityLabel={sessionCopy.sessionList.moreAction}
          accessibilityRole="button"
          disabled={props.isDeleting && !props.isMenuOpen}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            props.onToggleMenu();
          }}
          style={({ pressed }) => [styles.moreButton, pressed ? styles.moreButtonPressed : null]}
        >
          <Ionicons color={colors.textSecondary} name="ellipsis-horizontal" size={18} />
        </Pressable>
      </View>
    </Pressable>
  );
}
