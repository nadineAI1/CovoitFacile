import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config (depuis ta console)
const firebaseConfig = {
  apiKey: "AIzaSyA_Mf8zydWtOIR6RFX3XRhOaWybZcVUbZw",
  authDomain: "covoitfacile-edb91.firebaseapp.com",
  projectId: "covoitfacile-edb91",
  storageBucket: "covoitfacile-edb91.firebasestorage.app",
  messagingSenderId: "898059211606",
  appId: "1:898059211606:web:2754706642bdf47d2a7cf7",
  measurementId: "G-Y4M3H565EY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

let auth;
if (Platform.OS === 'web') {
  // Web : utiliser getAuth classique
  auth = getAuth(app);
} else {
  // React Native : initialiser auth avec persistance via AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { auth };