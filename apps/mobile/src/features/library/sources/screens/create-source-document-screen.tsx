import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "@/components/ui/field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useCreateSourceFromDocumentMutation } from "@/features/library/api";
import {
  formatSelectedDocumentSize,
  getSourceDocumentBaseName,
  pickSourceDocument,
} from "@/features/library/utils/source-document-picker";
import { type RootStackParamList } from "@/navigation/types";
import { createSourceDocumentScreenStyles as styles } from "@/features/library/sources/screens/create-source-document-screen.styles";

export function CreateSourceDocumentScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "CreateSourceDocument">) {
  const [selectedFile, setSelectedFile] = useState({
    fileName: route.params.fileName,
    fileSize: route.params.fileSize,
    fileType: route.params.fileType,
    fileUri: route.params.fileUri,
  });
  const [name, setName] = useState(getSourceDocumentBaseName(route.params.fileName));
  const createSourceMutation = useCreateSourceFromDocumentMutation();

  async function handlePickAnotherFile() {
    try {
      const file = await pickSourceDocument();

      if (!file) {
        return;
      }

      setSelectedFile(file);
      setName(getSourceDocumentBaseName(file.fileName));
    } catch (error) {
      Alert.alert(
        "文件选择失败",
        error instanceof Error ? error.message : "暂时无法读取这个文件，请稍后再试。",
      );
    }
  }

  async function handleSubmit() {
    const trimmedName = name.trim();

    if (!trimmedName || createSourceMutation.isPending) {
      return;
    }

    try {
      const created = await createSourceMutation.mutateAsync({
        fileName: selectedFile.fileName,
        fileType: selectedFile.fileType,
        fileUri: selectedFile.fileUri,
        name: trimmedName,
      });

      navigation.replace("SourceDetail", {
        sourceId: created.id,
        sourceName: created.name,
      });
    } catch (error) {
      Alert.alert(
        "上传失败",
        error instanceof Error ? error.message : "暂时无法上传这个文件，请稍后再试。",
      );
    }
  }

  function handlePickAnotherFilePress() {
    handlePickAnotherFile().catch(() => {});
  }

  function handleSubmitPress() {
    handleSubmit().catch(() => {});
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} subtitle="文件导入" title="新建知识来源" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>上传一个文件</Text>
          <Text style={styles.heroText}>
            提交后，系统会先创建知识来源，再根据文件内容生成待确认的知识卡片。
          </Text>
        </View>

        <View style={styles.formCard}>
          <Field
            label="来源名称"
            onChangeText={setName}
            placeholder="例如：React Native 路由设计文档"
            value={name}
          />

          <View style={styles.fileCard}>
            <Text style={styles.fileName}>{selectedFile.fileName}</Text>
            <Text style={styles.fileMeta}>
              {selectedFile.fileType || "未知类型"} · {formatSelectedDocumentSize(selectedFile.fileSize)}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <PrimaryButton
              label="重新选择文件"
              onPress={handlePickAnotherFilePress}
              variant="secondary"
            />
            <PrimaryButton
              disabled={!name.trim() || createSourceMutation.isPending}
              label={createSourceMutation.isPending ? "上传中…" : "开始生成卡片"}
              onPress={handleSubmitPress}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
