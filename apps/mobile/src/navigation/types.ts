export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  Chat: {
    chatId: string;
    title: string;
    isNew?: boolean;
  };
  CardList:
    | {
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
  };
  CreateSourceText: undefined;
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
