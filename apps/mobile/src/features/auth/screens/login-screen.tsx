import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field } from "../../../components/ui/field";
import { PrimaryButton } from "../../../components/ui/primary-button";
import { loginScreenStyles as styles } from "./login-screen.styles";

export function LoginScreen(props: { onLogin: () => void; onGoToRegister: () => void }) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>云笺智语</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>欢迎回来，继续整理你的知识。</Text>
            <Text style={styles.description}>
              先把登录页和主导航骨架搭起来，后续我们再继续补注册、会话详情和知识库二级页面。
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
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
                placeholder="输入密码"
                secureTextEntry
                value={password}
              />
            </View>

            <View style={styles.helperRow}>
              <Text style={styles.helperText}>当前为静态登录页骨架，稍后接入真实鉴权。</Text>
            </View>

            <PrimaryButton label="登录" onPress={props.onLogin} />
            <PrimaryButton
              label="去注册"
              onPress={props.onGoToRegister}
              variant="secondary"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerTitle}>下一步预留</Text>
            <Text style={styles.footerText}>
              注册页、验证码登录、忘记密码、用户协议入口都可以沿着这套结构继续补。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
