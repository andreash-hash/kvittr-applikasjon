/// <reference types="vite/client" />

declare global {
  interface Window {
    firebaseMessaging?: {
      getToken: (options?: { vapidKey?: string }) => Promise<string>;
    };
    FIREBASE_VAPID_KEY?: string;
  }
}

export {};
