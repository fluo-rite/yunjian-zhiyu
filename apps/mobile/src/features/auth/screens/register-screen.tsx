import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import {
  clearAuthError,
  registerThunk,
  selectAuthErrorMessage,
  selectIsSubmittingAuth,
} from "../../../store/auth-slice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { loginScreenStyles as styles } from "./login-screen.styles";

export function RegisterScreen(props: { onBackToLogin: () => void }) {
  const dispatch = useAppDispatch();
  const errorMessage = useAppSelector(selectAuthErrorMessage);
  const isSubmitting = useAppSelector(selectIsSubmittingAuth);

  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isFormValid = useMemo(
    () =>
      nickname.trim().length > 0 &&
      (username.trim().length === 0 || username.trim().length >= 3) &&
      email.trim().length > 0 &&
      password.trim().length >= 8 &&
      password === confirmPassword,
    [confirmPassword, email, nickname, password, username],
  );

  const helperText =
    errorMessage ??
    (submitAttempted && !isFormValid
      ? "请完善信息：用户名可留空或不少于 3 位，密码不少于 8 位，并确认两次输入一致。"
      : "创建账号后即可开始整理你的内容。");

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  function handleFieldChange(setter: (value: string) => void, value: string) {
    if (errorMessage) {
      dispatch(clearAuthError());
    }

    setter(value);
  }

  function handleRegister() {
    setSubmitAttempted(true);

    if (!isFormValid || isSubmitting) {
      return;
    }

    dispatch(
      registerThunk({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        username: username.trim() || undefined,
      }),
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>注册</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>创建你的账号</Text>
            <Text style={styles.description}>设置基本信息，开始整理你的知识内容。</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Field
                label="昵称"
                onChangeText={(value) => handleFieldChange(setNickname, value)}
                placeholder="输入你的昵称"
                value={nickname}
              />
              <Field
                autoCapitalize="none"
                label="用户名（选填）"
                onChangeText={(value) => handleFieldChange(setUsername, value)}
                placeholder="输入用户名，至少 3 位"
                value={username}
              />
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                label="邮箱"
                onChangeText={(value) => handleFieldChange(setEmail, value)}
                placeholder="输入常用邮箱"
                value={email}
              />
              <Field
                autoCapitalize="none"
                label="密码"
                onChangeText={(value) => handleFieldChange(setPassword, value)}
                placeholder="设置密码"
                secureTextEntry
                value={password}
              />
              <Field
                autoCapitalize="none"
                label="确认密码"
                onChangeText={(value) => handleFieldChange(setConfirmPassword, value)}
                placeholder="再次输入密码"
                secureTextEntry
                value={confirmPassword}
              />
            </View>

            <View style={styles.helperRow}>
              <Text style={styles.helperText}>{helperText}</Text>
            </View>

            <PrimaryButton
              disabled={!isFormValid || isSubmitting}
              label={isSubmitting ? "注册中…" : "注册并进入"}
              onPress={handleRegister}
            />
            <PrimaryButton label="返回登录" onPress={props.onBackToLogin} variant="secondary" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
