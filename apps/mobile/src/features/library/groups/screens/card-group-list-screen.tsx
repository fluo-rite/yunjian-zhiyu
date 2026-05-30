import { useMemo, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Field } from "@/components/ui/field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useCreateGroupMutation, useGroupsQuery } from "@/features/library/api";
import { GroupListItem } from "@/features/library/groups/components/group-list-item";
import { getStableArray } from "@/features/library/utils/library-state";
import { type RootStackParamList } from "@/navigation/types";
import { cardGroupListScreenStyles as styles } from "@/features/library/groups/screens/card-group-list-screen.styles";

export function CardGroupListScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "CardGroupList">) {
  const [draftName, setDraftName] = useState("");
  const groupsQuery = useGroupsQuery();
  const createGroupMutation = useCreateGroupMutation();
  const groups = getStableArray(groupsQuery.data?.items);

  async function handleCreateGroup() {
    const name = draftName.trim();

    if (!name || createGroupMutation.isPending) {
      return;
    }

    try {
      const created = await createGroupMutation.mutateAsync({ name });
      setDraftName("");
      navigation.navigate("CardGroupDetail", {
        groupId: created.id,
        groupName: created.name,
      });
    } catch (error) {
      Alert.alert("创建失败", error instanceof Error ? error.message : "暂时无法创建分组，请稍后再试。");
    }
  }

  const listHeaderComponent = (
    <View style={styles.headerContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>卡片分组</Text>
        <Text style={styles.resultMeta}>共 {groups.length} 个分组</Text>
      </View>

      <View style={styles.formCard}>
        <Field
          label="新建分组"
          onChangeText={setDraftName}
          placeholder="例如：React Native 路由"
          value={draftName}
        />
        <PrimaryButton
          disabled={!draftName.trim() || createGroupMutation.isPending}
          label={createGroupMutation.isPending ? "创建中…" : "创建分组"}
          onPress={handleCreateGroup}
        />
      </View>
    </View>
  );

  const listEmptyComponent = useMemo(() => {
    if (groupsQuery.isLoading) {
      return <EmptyState description="请稍候，我们正在同步你的分组列表。" title="正在加载分组" />;
    }

    if (groupsQuery.isError) {
      return (
        <ErrorState
          description={groupsQuery.error instanceof Error ? groupsQuery.error.message : "暂时无法读取分组，请稍后再试。"}
          onRetry={() => groupsQuery.refetch()}
          retryLabel="重新加载"
          title="分组加载失败"
        />
      );
    }

    return <EmptyState description="先创建一个分组，开始整理你的卡片。" title="暂无分组" />;
  }, [groupsQuery]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} subtitle="主题整理" title="卡片分组" />

      <FlatList
        contentContainerStyle={styles.content}
        data={groups}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        onRefresh={() => groupsQuery.refetch()}
        refreshing={groupsQuery.isRefetching}
        renderItem={({ item }) => (
          <GroupListItem
            group={item}
            onPress={() =>
              navigation.navigate("CardGroupDetail", {
                groupId: item.id,
                groupName: item.name,
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
