import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDMLXQjQSSZRPUdlOeNf1afg2WPPQFSTAI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rustique-6b7c4.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rustique-6b7c4',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rustique-6b7c4.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '272634614965',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:272634614965:web:82bb8ef1772cac9c019afc',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// App owner contact — shown everywhere instead of individual farmhouse owner contacts
export const APP_CONTACT = {
  upiId: import.meta.env.VITE_UPI_ID || 'reroute@upi',
  upiName: import.meta.env.VITE_UPI_NAME || 'ReRoute',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '+91-9999999999',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@reroute.app',
};
