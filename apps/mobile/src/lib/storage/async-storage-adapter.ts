import AsyncStorage from "@react-native-async-storage/async-storage";

import { type KeyValueStorage } from "./key-value-storage";

export const asyncStorageAdapter: KeyValueStorage = {
  getItem(key) {
    return AsyncStorage.getItem(key);
  },
  setItem(key, value) {
    return AsyncStorage.setItem(key, value);
  },
  removeItem(key) {
    return AsyncStorage.removeItem(key);
  },
};
