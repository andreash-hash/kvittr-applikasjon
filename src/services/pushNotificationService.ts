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
          await this.saveFcmToken(token.value);
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
   * Save FCM token to Supabase profiles table
   */
  static async saveFcmToken(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user logged in');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Error saving FCM token:', updateError);
      } else {
        console.log('FCM token saved successfully to profiles table');
      }
    } catch (error) {
      console.error('Error in saveFcmToken:', error);
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
   * Remove FCM token (on logout)
   */
  static async removeFcmToken() {
    const CapacitorAPI = await getCapacitor();
    
    if (!CapacitorAPI || !CapacitorAPI.isNativePlatform()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Clear FCM token in profiles table
      await supabase
        .from('profiles')
        .update({ fcm_token: null })
        .eq('id', user.id);
      
      console.log('FCM token cleared');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }
}
