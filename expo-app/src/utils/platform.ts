import { Platform } from 'react-native';

export const isMobileApp = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

export const getMobilePlatform = (): 'ios' | 'android' | 'web' => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
};
