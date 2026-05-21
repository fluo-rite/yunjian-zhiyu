import { Alert, Linking } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";

import {
  chatMessageMarkdownBodyStyles as styles,
  chatMessageMarkdownStyles,
} from "./chat-message-markdown-body.styles";

export type ChatMessageMarkdownBodyProps = {
  content: string;
};

async function openMarkdownLink(url: string) {
  try {
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert("无法打开链接", url);
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert("无法打开链接", url);
  }
}

export function ChatMessageMarkdownBody({ content }: ChatMessageMarkdownBodyProps) {
  return (
    <EnrichedMarkdownText
      allowTrailingMargin={false}
      containerStyle={styles.container}
      flavor="github"
      markdown={content}
      markdownStyle={chatMessageMarkdownStyles}
      md4cFlags={{ latexMath: false, underline: false }}
      onLinkPress={({ url }) => {
        void openMarkdownLink(url);
      }}
    />
  );
}
