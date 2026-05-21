import { useNavigation } from "@react-navigation/native";
import { type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type RootStackParamList } from "../../../navigation/types";
import { selectAuthUser } from "../../../store/auth-slice";
import { useAppSelector } from "../../../store/hooks";
import { profileScreenStyles as styles } from "./profile-screen.styles";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
            <Text style={styles.description}>{user?.email ?? "当前还没有可展示的账号信息。"}</Text>
            <Text style={styles.caption}>点击查看账号信息</Text>
          </View>
        </Pressable>

        <View style={styles.sectionCard}>
          <Pressable onPress={() => navigation.navigate("Settings")} style={styles.rowButton}>
            <View style={styles.rowCopy}>
              <Text style={styles.sectionTitle}>设置</Text>
              <Text style={styles.sectionText}>管理登录状态与当前账号。</Text>
            </View>
            <Text style={styles.rowAction}>进入</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
