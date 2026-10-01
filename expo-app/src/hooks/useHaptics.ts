import * as Haptics from 'expo-haptics';

export const useHaptics = () => {
  const impact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      const styleMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      await Haptics.impactAsync(styleMap[style]);
    } catch {
      // Haptics unavailable
    }
  };

  const notification = async (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      const typeMap = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      };
      await Haptics.notificationAsync(typeMap[type]);
    } catch {
      // Haptics unavailable
    }
  };

  const selection = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Haptics unavailable
    }
  };

  return { impact, notification, selection };
};
