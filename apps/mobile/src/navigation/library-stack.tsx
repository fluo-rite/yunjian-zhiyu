import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CardDetailScreen } from "../features/library/screens/card-detail-screen";
import { CardGroupDetailScreen } from "../features/library/screens/card-group-detail-screen";
import { CardGroupListScreen } from "../features/library/screens/card-group-list-screen";
import { CardListScreen } from "../features/library/screens/card-list-screen";
import { CreateSourceTextScreen } from "../features/library/screens/create-source-text-screen";
import { GroupCardPickerScreen } from "../features/library/screens/group-card-picker-screen";
import { LibraryHomeScreen } from "../features/library/screens/library-home-screen";
import { SourceDetailScreen } from "../features/library/screens/source-detail-screen";
import { SourceListScreen } from "../features/library/screens/source-list-screen";
import { type LibraryStackParamList } from "./types";

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export function LibraryStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={LibraryHomeScreen} name="LibraryHome" />
      <Stack.Screen component={CardListScreen} name="CardList" />
      <Stack.Screen component={CardDetailScreen} name="CardDetail" />
      <Stack.Screen component={CardGroupListScreen} name="CardGroupList" />
      <Stack.Screen component={CardGroupDetailScreen} name="CardGroupDetail" />
      <Stack.Screen component={GroupCardPickerScreen} name="GroupCardPicker" />
      <Stack.Screen component={SourceListScreen} name="SourceList" />
      <Stack.Screen component={SourceDetailScreen} name="SourceDetail" />
      <Stack.Screen component={CreateSourceTextScreen} name="CreateSourceText" />
    </Stack.Navigator>
  );
}
