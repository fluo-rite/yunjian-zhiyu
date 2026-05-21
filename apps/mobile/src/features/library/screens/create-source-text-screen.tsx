import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type RootStackParamList } from "../../../navigation/types";
import { useCreateSourceFromTextMutation } from "../api";
import { createSourceTextScreenStyles as styles } from "./create-source-text-screen.styles";

export function CreateSourceTextScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "CreateSourceText">) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const createSourceMutation = useCreateSourceFromTextMutation();

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();

    if (!trimmedName || !trimmedContent || createSourceMutation.isPending) {
      return;
    }

    try {
      const created = await createSourceMutation.mutateAsync({
        name: trimmedName,
        content: trimmedContent,
      });

      navigation.replace("SourceDetail", {
        sourceId: created.id,
        sourceName: created.name,
      });
    } catch (error) {
      Alert.alert("创建失败", error instanceof Error ? error.message : "暂时无法创建知识来源，请稍后再试。");
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} subtitle="文本导入" title="新建知识来源" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>添加一段内容</Text>
          <Text style={styles.heroText}>保存后，系统会根据内容生成可继续整理的卡片。</Text>
        </View>

        <View style={styles.formCard}>
          <Field
            label="来源名称"
            onChangeText={setName}
            placeholder="例如：React Native 路由设计笔记"
            value={name}
          />
          <Field
            label="内容"
            multiline
            onChangeText={setContent}
            placeholder="粘贴你想整理的笔记、资料或消息内容"
            value={content}
          />
          <PrimaryButton
            disabled={!name.trim() || !content.trim() || createSourceMutation.isPending}
            label={createSourceMutation.isPending ? "提交中…" : "开始生成卡片"}
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
