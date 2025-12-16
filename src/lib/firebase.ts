import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDuWM-puru4dAVUnQjKeEHYQvtViix8tBU",
  authDomain: "kvittr-push.firebaseapp.com",
  projectId: "kvittr-push",
  storageBucket: "kvittr-push.firebasestorage.app",
  messagingSenderId: "191789668682",
  appId: "1:191789668682:web:1c793c0e8e7c03c13749b3",
  measurementId: "G-T8BHF37F67"
};

// VAPID key for web push
const VAPID_KEY = "BKagOny0KF7t0xJxD17nHQNQbPqRIWFgNqyPqkPuWFQXQrXXPmOgcDbWKKaE4Y7f_1D4PUuSpMPuJvJn9nKnhSI";

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

// Initialize Firebase Messaging (web only)
const initializeMessaging = async () => {
  if (typeof window === 'undefined') return null;

  // Never run Firebase web push in native Capacitor builds
  const cap = (window as any)?.Capacitor;
  if (cap?.isNativePlatform?.()) {
    console.log('Firebase Messaging: Skipping on native platform');
    return null;
  }

  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return null;
    }

    // Register the Firebase service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Firebase service worker registered:', registration);

    messaging = getMessaging(app);

    // Set on window for Settings.tsx to use
    (window as any).firebaseMessaging = {
      getToken: async (options?: { vapidKey?: string }) => {
        if (!messaging) throw new Error('Messaging not initialized');
        return getToken(messaging, {
          vapidKey: options?.vapidKey || VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
      },
    };
    (window as any).FIREBASE_VAPID_KEY = VAPID_KEY;

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      // Show notification manually for foreground
      if (Notification.permission === 'granted' && payload.notification) {
        new Notification(payload.notification.title || 'Kvittr', {
          body: payload.notification.body,
          icon: '/kvittr-app-icon-light.png',
        });
      }
    });

    console.log('Firebase Messaging initialized for web');
    return messaging;
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
};

// Auto-initialize when module loads
initializeMessaging();

export { app, firebaseConfig, messaging, initializeMessaging, VAPID_KEY };

