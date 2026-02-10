import AsyncStorage from '@react-native-async-storage/async-storage';
import {modeStorageKey} from '../constants';
import {UserMode} from '../types';

export const getUserMode = async (): Promise<UserMode | null> => {
  const stored = await AsyncStorage.getItem(modeStorageKey);
  if (stored === 'client' || stored === 'contractor') {
    return stored;
  }

  return null;
};

export const setUserMode = (mode: UserMode) =>
  AsyncStorage.setItem(modeStorageKey, mode);
