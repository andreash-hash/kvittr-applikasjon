import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'theme_preference';

function applyTheme(pref: ThemePreference) {
  if (pref === 'light') Appearance.setColorScheme('light');
  else if (pref === 'dark') Appearance.setColorScheme('dark');
  else Appearance.setColorScheme(null);
}

export const initTheme = async (): Promise<void> => {
  try {
    const stored = (await AsyncStorage.getItem(THEME_KEY)) as ThemePreference | null;
    applyTheme(stored ?? 'system');
  } catch {}
};

export const getThemePreference = async (): Promise<ThemePreference> => {
  try {
    return ((await AsyncStorage.getItem(THEME_KEY)) as ThemePreference) ?? 'system';
  } catch {
    return 'system';
  }
};

export const setThemePreference = async (pref: ThemePreference): Promise<void> => {
  try {
    await AsyncStorage.setItem(THEME_KEY, pref);
    applyTheme(pref);
  } catch {}
};
