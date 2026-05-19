import { Pressable, ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { type ProfileStackParamList } from "../../../navigation/types";
import { selectAuthUser } from "../../../store/auth-slice";
import { useAppSelector } from "../../../store/hooks";
import { profileScreenStyles as styles } from "./profile-screen.styles";

export function ProfileScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "ProfileHome">) {
  const user = useAppSelector(selectAuthUser);

  const displayName = user?.nickname || user?.username || "未命名用户";
  const avatarText = displayName.slice(0, 1) || "我";

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.navigate("Account")} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.title}>{displayName}</Text>
            <Text style={styles.description}>
              {user?.email ?? "当前还没有可展示的账号信息。"}
            </Text>
            <Text style={styles.caption}>点击查看账号信息</Text>
          </View>
        </Pressable>

        <View style={styles.sectionCard}>
          <Pressable onPress={() => navigation.navigate("Settings")} style={styles.rowButton}>
            <View style={styles.rowCopy}>
              <Text style={styles.sectionTitle}>设置</Text>
              <Text style={styles.sectionText}>管理登录状态和退出当前账号</Text>
            </View>
            <Text style={styles.rowAction}>进入</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>当前鉴权状态</Text>
          <Text style={styles.sectionText}>
            当前账号已接入真实登录、注册、本地会话恢复和退出登录。后续可以继续补资料编辑接口。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
