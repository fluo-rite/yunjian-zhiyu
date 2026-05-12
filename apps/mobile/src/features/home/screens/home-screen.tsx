import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthPanel, type AuthMode } from "@/features/auth/components/auth-panel";
import { ChatWorkspace } from "@/features/chat/components/chat-workspace";
import { LibraryPanel } from "@/features/home/components/library-panel";
import { homeStyles as styles } from "@/features/home/styles";
import { saveSession, setAccessToken, type AuthResponse } from "@/lib/api";
import { selectAccessToken, selectHydrated, setSession } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function HomeScreen() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const accessToken = useAppSelector(selectAccessToken);
  const hydrated = useAppSelector(selectHydrated);

  const [mode, setMode] = useState<AuthMode>("login");
  const [workspace, setWorkspace] = useState<"chat" | "library">("chat");

  const handleAuthenticated = async (result: AuthResponse) => {
    await saveSession(result.tokens);
    setAccessToken(result.tokens.accessToken);
    dispatch(setSession(result.tokens));
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    await queryClient.invalidateQueries({ queryKey: ["cards", "list"] });
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator color="#163d33" size="large" />
          <Text style={styles.centerStateText}>正在初始化应用...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.screen}
      >
        {accessToken ? (
          <View style={styles.screen}>
            <View style={styles.workspaceSwitcher}>
              <Text style={styles.workspaceTitle}>学习工作台</Text>
              <View style={styles.segmentRow}>
                <View style={styles.workspaceTab}>
                  <AuthPanel
                    mode={workspace === "chat" ? "login" : "register"}
                    onAuthenticated={handleAuthenticated}
                    onModeChange={setMode}
                  />
                </View>
              </View>
            </View>
            <View style={styles.workspaceToggleBar}>
              <View style={styles.segmentRow}>
                <View style={styles.workspaceButton}>
                  <Text
                    onPress={() => setWorkspace("chat")}
                    style={[
                      styles.workspaceButtonLabel,
                      workspace === "chat" && styles.workspaceButtonLabelActive,
                    ]}
                  >
                    AI 对话
                  </Text>
                </View>
                <View style={styles.workspaceButton}>
                  <Text
                    onPress={() => setWorkspace("library")}
                    style={[
                      styles.workspaceButtonLabel,
                      workspace === "library" && styles.workspaceButtonLabelActive,
                    ]}
                  >
                    知识库
                  </Text>
                </View>
              </View>
            </View>
            {workspace === "chat" ? <ChatWorkspace /> : <LibraryPanel />}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.authContainer}>
            <AuthPanel mode={mode} onAuthenticated={handleAuthenticated} onModeChange={setMode} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
