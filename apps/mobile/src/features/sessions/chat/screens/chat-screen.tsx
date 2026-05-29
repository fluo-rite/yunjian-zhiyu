import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ui/screen-header";
import { type RootStackParamList } from "@/navigation/types";
import { ChatComposer } from "@/features/sessions/chat/components/chat-composer";
import { ChatMessageList } from "@/features/sessions/chat/components/chat-message-list";
import { ChatSelectionActionBar } from "@/features/sessions/chat/components/chat-selection-action-bar";
import { useChatSelectionController } from "@/features/sessions/chat/hooks/use-chat-selection-controller";
import { useChatSessionController } from "@/features/sessions/chat/hooks/use-chat-session-controller";
import { sessionCopy } from "@/features/sessions/utils/session-copy";
import { chatScreenStyles as styles } from "@/features/sessions/chat/screens/chat-screen.styles";

export function ChatScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "Chat">) {
  const insets = useSafeAreaInsets();
  const [composerHeight, setComposerHeight] = useState(112);

  const sessionController = useChatSessionController({
    initialSessionId: route.params.sessionId,
    initialTitle: route.params.title,
    isNew: route.params.isNew,
  });

  const selectionController = useChatSelectionController({
    sessionId: sessionController.sessionId,
    sessionTitle: sessionController.sessionTitle,
    fallbackTitle: sessionController.fallbackTitle,
    isMessagesLoading: sessionController.messagesQuery.isLoading,
    isStreaming: sessionController.isStreaming,
    messages: sessionController.messages,
    onImported: (source) => {
      navigation.navigate("SourceDetail", {
        sourceId: source.id,
        sourceName: source.name,
      });
    },
  });

  const rightLabel = selectionController.selectionMode
    ? sessionCopy.chat.cancelAction
    : selectionController.canEnterSelectionMode
      ? sessionCopy.chat.selectionAction
      : undefined;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => {
          if (selectionController.selectionMode) {
            selectionController.exitSelectionMode();
            return;
          }

          navigation.goBack();
        }}
        onRightPress={
          rightLabel
            ? () => {
                selectionController.toggleSelectionMode();
              }
            : undefined
        }
        rightLabel={rightLabel}
        title={sessionController.sessionTitle || sessionController.fallbackTitle}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.content}
      >
        <ChatMessageList
          composerSpacerHeight={composerHeight}
          ephemeralPhaseLabel={sessionController.stream.ephemeralPhaseLabel}
          errorMessage={
            sessionController.messagesQuery.error instanceof Error
              ? sessionController.messagesQuery.error.message
              : undefined
          }
          isError={sessionController.messagesQuery.isError}
          isLoading={
            sessionController.messagesQuery.isLoading &&
            Boolean(sessionController.sessionId)
          }
          messages={sessionController.messages}
          onToggleSelect={
            selectionController.selectionMode
              ? selectionController.toggleSelect
              : undefined
          }
          rangeEndMessageId={selectionController.rangeEndMessageId}
          rangeStartMessageId={selectionController.rangeStartMessageId}
          selectedIds={selectionController.selectedMessageIdSet}
          selectionMode={selectionController.selectionMode}
          streamAssistantMessageId={sessionController.streamAssistantMessageId}
          streamedContent={sessionController.stream.streamedContent}
          terminalMessage={sessionController.stream.terminalMessage}
        />

        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            if (nextHeight > 0 && nextHeight !== composerHeight) {
              setComposerHeight(nextHeight);
            }
          }}
          style={[styles.composerWrap, { paddingBottom: insets.bottom + 12 }]}
        >
          {selectionController.selectionMode ? (
            <ChatSelectionActionBar
              isSubmitting={selectionController.isImporting}
              onCancel={selectionController.exitSelectionMode}
              onSubmit={() => {
                selectionController.importSelectedMessages().catch(() => {});
              }}
              rangeStatus={selectionController.rangeStatus}
              selectedCount={selectionController.selectedCount}
            />
          ) : (
            <ChatComposer
              isAborting={sessionController.isAborting}
              isSending={sessionController.isSending}
              isStreaming={sessionController.isStreaming}
              onAbort={() => {
                sessionController.abortMessage().catch(() => {});
              }}
              onSend={(content) => {
                sessionController.sendMessage(content).catch(() => {});
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

