import { useMutation } from "@tanstack/react-query";
import { Alert, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";

import { Field } from "@/components/ui/field";
import { PrimaryButton } from "@/components/ui/primary-button";
import {
  extractApiError,
  login,
  register,
  type AuthResponse,
} from "@/lib/api";

import { authPanelStyles as styles } from "./auth-panel.styles";

export type AuthMode = "login" | "register";

type AuthFormValues = {
  account: string;
  email: string;
  username: string;
  nickname: string;
  password: string;
};

export function AuthPanel(props: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onAuthenticated: (result: AuthResponse) => Promise<void>;
}) {
  const { control, handleSubmit, reset } = useForm<AuthFormValues>({
    defaultValues: {
      account: "",
      email: "",
      username: "",
      nickname: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      await props.onAuthenticated(result);
      reset();
    },
    onError: (error) => {
      Alert.alert("登录失败", extractApiError(error));
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: async (result) => {
      await props.onAuthenticated(result);
      reset();
    },
    onError: (error) => {
      Alert.alert("注册失败", extractApiError(error));
    },
  });

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    if (props.mode === "login") {
      loginMutation.mutate({
        account: values.account.trim(),
        password: values.password,
      });
      return;
    }

    registerMutation.mutate({
      email: values.email.trim(),
      username: values.username.trim() || undefined,
      nickname: values.nickname.trim() || undefined,
      password: values.password,
    });
  });

  return (
    <View style={styles.authCard}>
      <View style={styles.heroRow}>
        <Text style={styles.heroEyebrow}>云笺智语</Text>
        <Text style={styles.heroTitle}>先把账号和知识库入口接起来</Text>
        <Text style={styles.heroSubtitle}>
          这一版先打通登录、注册和知识卡片列表，后面我们再接 AI 对话与导卡流程。
        </Text>
      </View>

      <View style={styles.segmentRow}>
        <PrimaryButton
          label="登录"
          onPress={() => props.onModeChange("login")}
          tone={props.mode === "login" ? "primary" : "secondary"}
        />
        <PrimaryButton
          label="注册"
          onPress={() => props.onModeChange("register")}
          tone={props.mode === "register" ? "primary" : "secondary"}
        />
      </View>

      {props.mode === "login" ? (
        <Controller
          control={control}
          name="account"
          render={({ field }) => (
            <Field
              label="邮箱或用户名"
              onChangeText={field.onChange}
              placeholder="user@example.com"
              value={field.value}
            />
          )}
        />
      ) : (
        <>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Field
                label="邮箱"
                onChangeText={field.onChange}
                placeholder="user@example.com"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="username"
            render={({ field }) => (
              <Field
                label="用户名"
                onChangeText={field.onChange}
                placeholder="alice"
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="nickname"
            render={({ field }) => (
              <Field
                label="昵称"
                onChangeText={field.onChange}
                placeholder="Alice"
                value={field.value}
              />
            )}
          />
        </>
      )}

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Field
            label="密码"
            onChangeText={field.onChange}
            placeholder="至少 8 位"
            secureTextEntry
            value={field.value}
          />
        )}
      />

      <PrimaryButton
        disabled={isSubmitting}
        label={isSubmitting ? "提交中..." : props.mode === "login" ? "登录" : "注册"}
        onPress={onSubmit}
      />
    </View>
  );
}
