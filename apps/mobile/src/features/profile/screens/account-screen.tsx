import { ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "../../../components/ui/screen-header";
import { type RootStackParamList } from "../../../navigation/types";
import { selectAuthUser } from "../../../store/auth-slice";
import { useAppSelector } from "../../../store/hooks";
import { accountScreenStyles as styles } from "./account-screen.styles";

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{props.label}</Text>
      <Text style={styles.infoValue}>{props.value}</Text>
    </View>
  );
}

export function AccountScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Account">) {
  const user = useAppSelector(selectAuthUser);

  const displayName = user?.nickname || user?.username || "未命名用户";
  const providerText = user?.authProvider === "oauth" ? "OAuth" : "本地账号";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} subtitle="账号信息" title="个人资料" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{displayName}</Text>
          <Text style={styles.heroText}>查看当前账号的基础资料与登录信息。</Text>
        </View>

        <View style={styles.sectionCard}>
          <InfoRow label="昵称" value={user?.nickname || "未设置"} />
          <InfoRow label="用户名" value={user?.username || "未设置"} />
          <InfoRow label="邮箱" value={user?.email || "未登录"} />
          <InfoRow label="登录方式" value={providerText} />
          <InfoRow label="注册时间" value={formatDateLabel(user?.createdAt)} />
          <InfoRow label="最近更新" value={formatDateLabel(user?.updatedAt)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
