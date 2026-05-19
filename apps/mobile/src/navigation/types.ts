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
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Account: undefined;
  Settings: undefined;
};
