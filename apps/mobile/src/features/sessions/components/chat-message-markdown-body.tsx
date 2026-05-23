import { Alert, Linking, View } from "react-native";
import Markdown, { MarkdownIt } from "react-native-markdown-display";

import {
  chatMessageMarkdownBodyStyles as styles,
  chatMessageMarkdownStyles,
} from "@/features/sessions/components/chat-message-markdown-body.styles";

export type ChatMessageMarkdownBodyProps = {
  content: string;
};

const markdownit = MarkdownIt({
  typographer: true,
  linkify: true,
});

async function openMarkdownLink(url: string) {
  try {
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert("Unable to open link", url);
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to open link", url);
  }
}

export function ChatMessageMarkdownBody({ content }: ChatMessageMarkdownBodyProps) {
  return (
    <View style={styles.container}>
      <Markdown
        markdownit={markdownit}
        onLinkPress={(url) => {
          void openMarkdownLink(url);
          return false;
        }}
        style={chatMessageMarkdownStyles}
      >
        {content}
      </Markdown>
    </View>
  );
}
