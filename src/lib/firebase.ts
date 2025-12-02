import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDuWM-puru4dAVUnQjKeEHYQvtViix8tBU",
  authDomain: "kvittr-push.firebaseapp.com",
  projectId: "kvittr-push",
  storageBucket: "kvittr-push.firebasestorage.app",
  messagingSenderId: "191789668682",
  appId: "1:191789668682:web:1c793c0e8e7c03c13749b3",
  measurementId: "G-T8BHF37F67"
};

const app = initializeApp(firebaseConfig);

export { app, firebaseConfig };
