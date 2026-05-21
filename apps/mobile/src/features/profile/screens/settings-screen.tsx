import { Alert, ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import {
  logoutThunk,
  selectAuthUser,
  selectIsLoggingOut,
} from "../../../store/auth-slice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { type RootStackParamList } from "../../../navigation/types";
import { settingsScreenStyles as styles } from "./settings-screen.styles";

export function SettingsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Settings">) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const isLoggingOut = useAppSelector(selectIsLoggingOut);

  function handleLogout() {
    Alert.alert("退出登录", "退出后会清除当前设备上的本地会话，需要重新输入账号密码。", [
      { text: "取消", style: "cancel" },
      {
        text: "确认退出",
        style: "destructive",
        onPress: () => {
          dispatch(logoutThunk());
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader onBack={() => navigation.goBack()} subtitle="偏好与安全" title="设置" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>当前账号</Text>
          <Text style={styles.sectionText}>
            {user?.email ?? "未登录"} {user?.nickname ? `· ${user.nickname}` : ""}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>登录与安全</Text>
          <Text style={styles.sectionText}>
            当前版本已经支持真实登录、注册和本地会话恢复。退出登录会清除本地 token。
          </Text>
        </View>

        <PrimaryButton
          disabled={isLoggingOut}
          label={isLoggingOut ? "正在退出..." : "退出登录"}
          onPress={handleLogout}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
