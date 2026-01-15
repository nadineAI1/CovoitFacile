import React from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { safeResetRoot } from '../navigation/RootNavigation';

/**
 * LogoutButton (safe)
 * Props:
 *  - redirect (optional): route name (string) to try resetting to after signOut (safeResetRoot will be used)
 *  - onSignedOut (optional): callback called after signOut
 */
export default function LogoutButton({ redirect = null, onSignedOut = null }) {
  const handleSignOutConfirmed = async () => {
    try {
      await signOut(auth);
      if (typeof onSignedOut === 'function') onSignedOut();

      if (redirect) {
        try {
          const ok = safeResetRoot(redirect);
          if (!ok) {
            // fallback: nothing, rely on onAuthStateChanged to re-render navigation
            console.warn('LogoutButton: safeResetRoot returned false for', redirect);
          }
        } catch (e) {
          console.warn('LogoutButton: safeResetRoot error', e);
        }
      }
      // otherwise do nothing; App.onAuthStateChanged will update navigation
    } catch (e) {
      console.warn('signOut error', e);
      Alert.alert('Erreur', 'Impossible de se déconnecter.');
    }
  };

  const handlePress = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: handleSignOutConfirmed },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ paddingHorizontal: 12, marginLeft: 8 }}>
      <Text style={{ color: '#c0392b', fontWeight: '700' }}>Déconnexion</Text>
    </TouchableOpacity>
  );
}