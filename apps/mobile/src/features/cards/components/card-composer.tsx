import { useMutation } from "@tanstack/react-query";
import { Alert, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { createCard, extractApiError } from "@/lib/api";
import { homeStyles as styles } from "@/features/home/styles";

type CardFormValues = {
  title: string;
  summary: string;
  content: string;
  tags: string;
};

export function CardComposer(props: { onCreated: () => void }) {
  const { control, handleSubmit, reset } = useForm<CardFormValues>({
    defaultValues: {
      title: "",
      summary: "",
      content: "",
      tags: "",
    },
  });

  const createCardMutation = useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      reset();
      props.onCreated();
    },
    onError: (error) => {
      Alert.alert("创建卡片失败", extractApiError(error));
    },
  });

  const onSubmit = handleSubmit((values) => {
    createCardMutation.mutate({
      title: values.title.trim(),
      summary: values.summary.trim() || undefined,
      content: values.content.trim(),
      cardType: "summary",
      tags: values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: "active",
      sourceType: "manual",
    });
  });

  return (
    <View style={styles.cardComposer}>
      <Text style={styles.sectionTitle}>新建知识卡片</Text>

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <Field
            label="标题"
            onChangeText={field.onChange}
            placeholder="例如：FastAPI 路由基础"
            value={field.value}
          />
        )}
      />

      <Controller
        control={control}
        name="summary"
        render={({ field }) => (
          <Field
            label="摘要"
            onChangeText={field.onChange}
            placeholder="一句话总结"
            value={field.value}
          />
        )}
      />

      <Controller
        control={control}
        name="content"
        render={({ field }) => (
          <Field
            label="正文"
            multiline
            onChangeText={field.onChange}
            placeholder="输入卡片内容"
            value={field.value}
          />
        )}
      />

      <Controller
        control={control}
        name="tags"
        render={({ field }) => (
          <Field
            label="标签"
            onChangeText={field.onChange}
            placeholder="用英文逗号分隔，例如 FastAPI, Backend"
            value={field.value}
          />
        )}
      />

      <PrimaryButton
        disabled={createCardMutation.isPending}
        label={createCardMutation.isPending ? "保存中..." : "保存卡片"}
        onPress={onSubmit}
      />
    </View>
  );
}
