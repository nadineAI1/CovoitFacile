import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { getUserProfile } from '../services/firestore';
import { auth } from '../firebase';

// Usage : dans un écran, appelle <RequireRole role="driver" navigation={navigation} /> en haut
export default function RequireRole({ role, navigation, children }) {
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!auth.currentUser) return;
      const p = await getUserProfile(auth.currentUser.uid);
      if (!mounted) return;
      if (!p || p.role !== role) {
        Alert.alert('Accès refusé', "Tu n'as pas la permission d'accéder à cet écran.");
        // Redirige vers le dashboard principal selon rôle
        navigation.replace(p?.role === 'driver' ? 'Driver' : 'Student');
      }
    })();
    return () => { mounted = false; };
  }, [navigation, role]);
  return children || null;
}