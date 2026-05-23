import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugLog = async (msg: string, data?: unknown): Promise<void> => {
  const line = `[${new Date().toISOString()}] ${msg}${data !== undefined ? ' ' + JSON.stringify(data).slice(0, 800) : ''}`;
  console.log(line);
  try {
    const prev = (await AsyncStorage.getItem('debug_logs')) ?? '';
    const lines = prev.split('\n').filter(Boolean);
    lines.push(line);
    while (lines.length > 200) lines.shift();
    await AsyncStorage.setItem('debug_logs', lines.join('\n'));
  } catch {}
};

export const getDebugLogs = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem('debug_logs');
    if (!data) return [];
    return data.split('\n').filter(Boolean).reverse(); // newest first
  } catch {
    return [];
  }
};

export const clearDebugLogs = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('debug_logs');
  } catch {}
};
