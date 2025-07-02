import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDtgkTofrL9UqMKWJgj3nBGZ9b6XewYSh0",
  authDomain: "couri-mobile.firebaseapp.com",
  projectId: "couri-mobile",
  storageBucket: "couri-mobile.firebasestorage.app",
  messagingSenderId: "565049535168",
  appId: "1:565049535168:web:e90394ecb89f5f41199b25",
  measurementId: "G-3H8DVPE90F"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getApps().length === 0 ? initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
})
  : getAuth(app);
export { auth };
