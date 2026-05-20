import { useMemo, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type LibraryStackParamList } from "../../../navigation/types";
import { useCreateGroupMutation, useGroupsQuery } from "../api";
import { EmptyState } from "../components/empty-state";
import { ErrorState } from "../components/error-state";
import { GroupListItem } from "../components/group-list-item";
import { getStableArray } from "../utils/library-state";
import { cardGroupListScreenStyles as styles } from "./card-group-list-screen.styles";

export function CardGroupListScreen({
  navigation,
}: NativeStackScreenProps<LibraryStackParamList, "CardGroupList">) {
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
      Alert.alert(
        "创建失败",
        error instanceof Error ? error.message : "暂时无法创建分组，请稍后再试。",
      );
    }
  }

  const listHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>按主题组织你的知识卡片</Text>
          <Text style={styles.heroText}>
            分组页负责承接“专题整理”这条链路。你可以先创建一个主题分组，再从全量卡片中把相关卡片加入进去。
          </Text>
          <Text style={styles.resultMeta}>当前共有 {groups.length} 个分组</Text>
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
            label={createGroupMutation.isPending ? "创建中..." : "创建分组"}
            onPress={handleCreateGroup}
          />
        </View>
      </View>
    ),
    [createGroupMutation.isPending, draftName, groups.length],
  );

  const listEmptyComponent = useMemo(() => {
    if (groupsQuery.isLoading) {
      return (
        <EmptyState
          description="正在从服务端读取卡片分组列表，请稍等片刻。"
          title="正在加载卡片分组"
        />
      );
    }

    if (groupsQuery.isError) {
      return (
        <ErrorState
          description={
            groupsQuery.error instanceof Error
              ? groupsQuery.error.message
              : "暂时无法读取卡片分组，请稍后再试。"
          }
          onRetry={() => groupsQuery.refetch()}
          retryLabel="重新加载"
          title="分组列表加载失败"
        />
      );
    }

    return (
      <EmptyState
        description="现在还没有卡片分组。先创建一个主题分组，后续再把卡片逐步归拢进来。"
        title="暂时没有卡片分组"
      />
    );
  }, [groupsQuery]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} subtitle="主题组织" title="卡片分组" />

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
