import { Text, View } from "react-native";

import { Field } from "@/components/ui/field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { type CardGroup } from "@/features/library/api";
import { formatDateTimeLabel } from "@/features/library/utils/library-formatters";
import { cardGroupDetailScreenStyles as styles } from "@/features/library/groups/screens/card-group-detail-screen.styles";

export function CardGroupDetailOverviewSection({
  group,
}: {
  group: CardGroup;
}) {
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroTitle}>{group.name}</Text>
      <Text style={styles.heroMeta}>最近更新 {formatDateTimeLabel(group.updatedAt)}</Text>
    </View>
  );
}

export function CardGroupSettingsSection({
  nameDraft,
  currentName,
  isRenaming,
  isDeleting,
  onChangeName,
  onRename,
  onDelete,
}: {
  nameDraft: string;
  currentName: string;
  isRenaming: boolean;
  isDeleting: boolean;
  onChangeName: (value: string) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.manageCard}>
      <Text style={styles.manageTitle}>分组设置</Text>
      <Field
        label="分组名称"
        onChangeText={onChangeName}
        placeholder="输入新的分组名称"
        value={nameDraft}
      />
      <PrimaryButton
        disabled={!nameDraft.trim() || nameDraft.trim() === currentName || isRenaming}
        label={isRenaming ? "保存中…" : "保存名称"}
        onPress={onRename}
      />
      <PrimaryButton
        label={isDeleting ? "删除中…" : "删除分组"}
        onPress={onDelete}
        variant="secondary"
      />
    </View>
  );
}

export function CardGroupActionsSection({
  cardCount,
  isSelectionMode,
  onAddCards,
  onOpenFilteredCards,
  onToggleSelectionMode,
}: {
  cardCount: number;
  isSelectionMode: boolean;
  onAddCards: () => void;
  onOpenFilteredCards: () => void;
  onToggleSelectionMode: () => void;
}) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>组内卡片</Text>
        <Text style={styles.sectionCaption}>共 {cardCount} 张</Text>
      </View>

      <View style={styles.actionsCard}>
        <PrimaryButton label="添加卡片" onPress={onAddCards} />
        <PrimaryButton label="按本组筛选" onPress={onOpenFilteredCards} variant="secondary" />
        <PrimaryButton
          iconName={isSelectionMode ? "close-outline" : "remove-circle-outline"}
          label={isSelectionMode ? "取消移除" : "批量移除"}
          onPress={onToggleSelectionMode}
          variant="secondary"
        />
      </View>

      {isSelectionMode ? (
        <View style={styles.selectionHintCard}>
          <Text style={styles.selectionHintTitle}>选择要移出的卡片</Text>
          <Text style={styles.selectionHintText}>移除只会解除当前分组关系，不会删除卡片本身。</Text>
        </View>
      ) : null}
    </>
  );
}
