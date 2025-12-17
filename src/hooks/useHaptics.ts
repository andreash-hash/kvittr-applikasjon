import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

export const useHaptics = () => {
  const isNative = Capacitor.isNativePlatform();

  const impact = async (style: ImpactStyle = 'medium') => {
    if (!isNative) return;
    
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] });
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  const notification = async (type: NotificationType = 'success') => {
    if (!isNative) return;
    
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      };
      await Haptics.notification({ type: typeMap[type] });
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  const selectionStart = async () => {
    if (!isNative) return;
    
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionStart();
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  const selectionChanged = async () => {
    if (!isNative) return;
    
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionChanged();
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  const selectionEnd = async () => {
    if (!isNative) return;
    
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionEnd();
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  return {
    impact,
    notification,
    selectionStart,
    selectionChanged,
    selectionEnd,
  };
};
