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
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Kvittr';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
