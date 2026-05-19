import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { profileScreenStyles as styles } from "./profile-screen.styles";

export function ProfileScreen(props: { onLogout: () => void }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>云</Text>
          </View>
          <Text style={styles.title}>我的</Text>
          <Text style={styles.description}>
            这里后续会放头像、昵称、简介、设置入口，以及单独的个人资料和设置二级页面。
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>当前占位内容</Text>
          <Text style={styles.sectionText}>
            下一步会补“个人资料页”和“设置页”，并让它们在进入后隐藏底栏。
          </Text>
        </View>

        <PrimaryButton label="退出登录（占位）" onPress={props.onLogout} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}
