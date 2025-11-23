# Firebase Cloud Messaging Implementation Guide

## Problem
The Firebase npm package causes TypeScript compiler stack overflow errors in Lovable's build system. This is a known issue with complex type definitions in the Firebase SDK.

## Firebase Configuration
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDuWM-puru4dAVUnQjKeEHYQvtViix8tBU",
  projectId: "kvittr-push",
  messagingSenderId: "191789668682",
  appId: "1:191789668682:web:1c793c0e8e7c03c13749b3"
};

const VAPID_KEY = "BPM6Gw7dCaWS9-7_0_naLbiXJJLjTSVYVFDDc_bw4P4fz0ktGCkKl0k9LGrS5oVwHr1R83bVa8kVWjCiBiZNZ80";
```

## Implementation Steps (for when Lovable fixes the build issue)

### 1. Install Firebase
```bash
npm install firebase@10.7.2
```

### 2. Create `/src/lib/firebase.ts`
```typescript
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDuWM-puru4dAVUnQjKeEHYQvtViix8tBU",
  projectId: "kvittr-push",
  messagingSenderId: "191789668682",
  appId: "1:191789668682:web:1c793c0e8e7c03c13749b3"
};

const VAPID_KEY = "BPM6Gw7dCaWS9-7_0_naLbiXJJLjTSVYVFDDc_bw4P4fz0ktGCkKl0k9LGrS5oVwHr1R83bVa8kVWjCiBiZNZ80";

const app = initializeApp(firebaseConfig);

export async function requestNotificationPermissionAndGetToken(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}
```

### 3. Create `/public/firebase-messaging-sw.js`
```javascript
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDuWM-puru4dAVUnQjKeEHYQvtViix8tBU",
  projectId: "kvittr-push",
  messagingSenderId: "191789668682",
  appId: "1:191789668682:web:1c793c0e8e7c03c13749b3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Kvittr';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

### 4. Register Service Worker in `App.tsx`
```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }
}, []);
```

### 5. Update Settings Page
```typescript
import { requestNotificationPermissionAndGetToken } from '@/lib/firebase';

const handlePushToggle = async (enabled: boolean) => {
  if (!userId) return;
  
  setIsLoading(true);
  
  try {
    setPushEnabled(enabled);
    
    if (enabled) {
      const token = await requestNotificationPermissionAndGetToken();
      
      if (!token) {
        throw new Error('Could not get notification permission or token');
      }
      
      // Save token to Supabase
      await supabase.from('push_tokens').upsert({
        user_id: userId,
        token: token,
        platform: 'web',
        enabled: true
      });
    } else {
      await supabase.from('push_tokens')
        .update({ enabled: false })
        .eq('user_id', userId);
    }
    
    await supabase.from('user_settings').upsert({
      user_id: userId,
      notification_enabled: enabled
    });
    
    toast({ title: "Settings updated" });
  } catch (error) {
    console.error(error);
    setPushEnabled(!enabled);
  } finally {
    setIsLoading(false);
  }
};
```

## Alternative: Use Firebase via CDN
If npm package continues to fail, load Firebase via CDN in `index.html`:
```html
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js"></script>
```

Then use `window.firebase` in your code.

## Sending Notifications from Backend
Use Firebase Admin SDK or REST API from Supabase Edge Function to send notifications using the tokens stored in `push_tokens` table.
