import { supabase } from '@/integrations/supabase/client';

let Capacitor: any;

// Dynamically import Capacitor to avoid build errors in web preview
async function getCapacitor() {
  if (!Capacitor) {
    try {
      const capacitorModule = await import('@capacitor/core');
      Capacitor = capacitorModule.Capacitor;
    } catch (error) {
      console.log('Capacitor not available');
    }
  }
  return Capacitor;
}

export class PushNotificationService {
  
  /**
   * Initialize push notifications
   * Call this on app startup (after user login)
   */
  static async initialize() {
    const CapacitorAPI = await getCapacitor();
    
    // Only use Capacitor Push Notifications on native platforms
    if (!CapacitorAPI || !CapacitorAPI.isNativePlatform()) {
      console.log('Not on native platform, skipping Capacitor push notifications');
      return;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Request permission
      const permissionResult = await PushNotifications.requestPermissions();
      
      if (permissionResult.receive === 'granted') {
        // Register with FCM
        await PushNotifications.register();
        
        // Listen for registration success
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success:', token.value);
          await this.savePushToken(token.value);
        });
        
        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });
        
        // Listen for push notifications received
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          // Handle notification while app is in foreground
        });
        
        // Listen for push notification actions (user tapped notification)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          this.handleNotificationClick(action.notification.data);
        });
      } else {
        console.log('Push notification permission denied');
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }
  
  /**
   * Save FCM token to Supabase
   */
  static async savePushToken(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user logged in');
        return;
      }

      const CapacitorAPI = await getCapacitor();
      
      // Detect platform
      const platform = CapacitorAPI ? CapacitorAPI.getPlatform() : 'web';
      
      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('token', token)
        .maybeSingle();
      
      if (!existingToken) {
        // Insert new token
        const { error } = await supabase
          .from('push_tokens')
          .insert({
            user_id: user.id,
            token: token,
            platform: platform,
            enabled: true
          });
        
        if (error) {
          console.error('Error saving push token:', error);
        } else {
          console.log('Push token saved successfully');
        }
      } else {
        // Update existing token to enabled
        await supabase
          .from('push_tokens')
          .update({ enabled: true })
          .eq('id', existingToken.id);
      }
    } catch (error) {
      console.error('Error in savePushToken:', error);
    }
  }
  
  /**
   * Handle notification click
   * Navigate user to relevant screen
   */
  static handleNotificationClick(data: any) {
    console.log('Notification clicked:', data);
    
    // Navigate to receipt detail if receipt_id is provided
    if (data.receipt_id) {
      window.location.href = `/item/${data.receipt_id}`;
    }
  }
  
  /**
   * Remove push token (on logout)
   */
  static async removePushToken() {
    const CapacitorAPI = await getCapacitor();
    
    if (!CapacitorAPI || !CapacitorAPI.isNativePlatform()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Mark all user tokens as inactive
      await supabase
        .from('push_tokens')
        .update({ enabled: false })
        .eq('user_id', user.id);
      
      console.log('Push tokens deactivated');
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }
}
