import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { loginScreenStyles as styles } from "./login-screen.styles";

export function RegisterScreen(props: {
  onRegister: () => void;
  onBackToLogin: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>注册</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>创建你的知识空间。</Text>
            <Text style={styles.description}>
              这是一版注册页占位骨架，结构已经接入标准导航，后面可以继续扩成真实注册流程。
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Field
                label="昵称"
                onChangeText={setNickname}
                placeholder="输入你的昵称"
                value={nickname}
              />
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                label="账号"
                onChangeText={setAccount}
                placeholder="输入邮箱或账号"
                value={account}
              />
              <Field
                autoCapitalize="none"
                label="密码"
                onChangeText={setPassword}
                placeholder="设置密码"
                secureTextEntry
                value={password}
              />
            </View>

            <PrimaryButton label="注册并进入" onPress={props.onRegister} />
            <PrimaryButton
              label="返回登录"
              onPress={props.onBackToLogin}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
