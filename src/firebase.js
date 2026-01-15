import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';


const firebaseConfig = {
  apiKey: "AIzaSyA_Mf8zydWtOIR6RFX3XRhOaWybZcVUbZw",
  authDomain: "covoitfacile-edb91.firebaseapp.com",
  projectId: "covoitfacile-edb91",
  storageBucket: "covoitfacile-edb91.firebasestorage.app",
  messagingSenderId: "898059211606",
  appId: "1:898059211606:web:2754706642bdf47d2a7cf7",
  measurementId: "G-Y4M3H565EY"
};


export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const storage = getStorage(app);

export let auth;
if (Platform.OS !== 'web') {
  try {
  
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

  } catch (e) {

    console.warn('initializeAuth failed, fallback to getAuth:', e.message);
    auth = getAuth(app);
  }
} else {

  auth = getAuth(app);
}