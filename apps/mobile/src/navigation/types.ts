export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  SessionsStack: undefined;
  LibraryStack: undefined;
  ProfileStack: undefined;
};

export type SessionsStackParamList = {
  SessionList: undefined;
  Chat: {
    chatId: string;
    title: string;
    isNew?: boolean;
  };
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
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
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Account: undefined;
  Settings: undefined;
};
