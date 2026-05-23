import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "@/components/ui/field";
import { PrimaryButton } from "@/components/ui/primary-button";
import {
  clearAuthError,
  loginThunk,
  selectAuthErrorMessage,
  selectIsSubmittingAuth,
} from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginScreenStyles as styles } from "@/features/auth/screens/login-screen.styles";

export function LoginScreen(props: { onGoToRegister: () => void }) {
  const dispatch = useAppDispatch();
  const errorMessage = useAppSelector(selectAuthErrorMessage);
  const isSubmitting = useAppSelector(selectIsSubmittingAuth);

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isFormValid = useMemo(() => account.trim().length > 0 && password.trim().length >= 8, [account, password]);

  const helperText =
    errorMessage ??
    (submitAttempted && !isFormValid
      ? "请输入账号，并确保密码不少于 8 位。"
      : "登录后可继续查看你的会话、卡片与资料。");

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  function handleAccountChange(text: string) {
    if (errorMessage) {
      dispatch(clearAuthError());
    }
    setAccount(text);
  }

  function handlePasswordChange(text: string) {
    if (errorMessage) {
      dispatch(clearAuthError());
    }
    setPassword(text);
  }

  function handleLogin() {
    setSubmitAttempted(true);

    if (!isFormValid || isSubmitting) {
      return;
    }

    dispatch(
      loginThunk({
        account: account.trim(),
        password,
      }),
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>云笺智语</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>欢迎回来</Text>
            <Text style={styles.description}>登录后继续你的整理与记录。</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                label="账号"
                onChangeText={handleAccountChange}
                placeholder="输入邮箱或用户名"
                value={account}
              />
              <Field
                autoCapitalize="none"
                label="密码"
                onChangeText={handlePasswordChange}
                placeholder="输入密码"
                secureTextEntry
                value={password}
              />
            </View>

            <View style={styles.helperRow}>
              <Text style={styles.helperText}>{helperText}</Text>
              <Pressable onPress={() => {}}>
                <Text style={styles.helperAction}>忘记密码</Text>
              </Pressable>
            </View>

            <PrimaryButton
              disabled={!isFormValid || isSubmitting}
              label={isSubmitting ? "登录中…" : "登录"}
              onPress={handleLogin}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>还没有账号？</Text>
              <Pressable onPress={props.onGoToRegister}>
                <Text style={styles.switchAction}>去注册</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
