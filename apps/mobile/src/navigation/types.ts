import { type NavigatorScreenParams } from "@react-navigation/native";
import type { CardMutationContext } from "@/features/library/api/card-mutation-context";
import type {
  CardDetailMode,
  CardListMode,
  SourceDetailMode,
} from "@/features/library/utils/library-view-modes";

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: {
    sessionId: string;
    title: string;
    isNew?: boolean;
  };
  CardList:
    | {
        mode?: CardListMode;
        status?: "pending" | "active" | "archived";
        groupId?: string;
        groupName?: string;
        sourceId?: string;
        sourceName?: string;
        keyword?: string;
      }
    | undefined;
  CardDetail: {
    cardId: string;
    mode?: CardDetailMode;
    cardMutationContext?: CardMutationContext;
    sourceContextId?: string;
  };
  CardGroupList: undefined;
  CardGroupDetail: {
    groupId: string;
    groupName?: string;
  };
  GroupCardPicker: {
    groupId: string;
    groupName?: string;
    existingCardIds?: string[];
  };
  SourceList:
    | {
        status?: "processing" | "ready" | "failed";
        sourceType?: "manual_text" | "document" | "messages";
      }
    | undefined;
  SourceDetail: {
    sourceId: string;
    sourceName?: string;
    mode?: SourceDetailMode;
  };
  CreateSourceText: undefined;
  CreateSourceDocument: {
    fileUri: string;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
  };
  Account: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  SessionsHome: undefined;
  LibraryHome: undefined;
  ProfileHome: undefined;
};
