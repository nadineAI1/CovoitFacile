import { Platform } from 'react-native';
global.Platform = global.Platform || Platform;

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens / Stacks
import WelcomeScreen from './src/screens/WelcomeScreen';
import StudentAuthStack from './src/navigation/StudentAuthStack';
import DriverAuthStack from './src/navigation/DriverAuthStack';
import StudentTabs from './src/navigation/StudentTabs';
import DriverTabs from './src/navigation/DriverTabs';
import MessagesScreen from './src/screens/MessagesScreen';
import MapSearchScreen from './src/screens/MapSearchScreen';

// Firebase
import { auth } from './src/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from './src/services/firestore';

// Theme
import { Colors } from './src/theme';

// navigation helpers (global ref + pending reset utilities)
import { navigationRef, applyPendingResetIfAny, safeResetRoot } from './src/navigation/RootNavigation';

const RootStack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Auth listener
  useEffect(() => {
    let mounted = true;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      try {
        if (!mounted) return;
        setUser(u);

        if (!u) {
          // logged out -> go to Welcome
          setProfile(null);
          if (mounted) setInitializing(false);

          // use safeResetRoot helper (that defers if nav not ready)
          try { safeResetRoot('Welcome'); } catch (e) { console.warn('safeResetRoot logout error', e); }
          return;
        }

        // logged in
        let profileData = null;
        try {
          profileData = await getUserProfile(u.uid);
          if (!mounted) return;
          setProfile(profileData || null);
        } catch (profileErr) {
          console.warn('getUserProfile failed (permission or network):', profileErr);
          setProfile(null);
        } finally {
          if (mounted) setInitializing(false);
        }

        const role = (profileData && profileData.role) ? profileData.role : 'student';
        const target = role === 'driver' ? 'Driver' : 'Student';

        try { safeResetRoot(target); } catch (e) { console.warn('safeResetRoot login error', e); }
      } catch (e) {
        console.warn('onAuthStateChanged handler error', e);
        if (mounted) {
          setProfile(null);
          setInitializing(false);
        }
      }
    });

    return () => {
      mounted = false;
      try { if (typeof unsubAuth === 'function') unsubAuth(); } catch (e) {}
    };
  }, []);

  // when navigation container becomes ready, apply any pending reset stored in RootNavigation
  // (we use onReady prop below to call applyPendingResetIfAny)
  if (initializing) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors?.background || '#fff' }}>
          <ActivityIndicator size="large" color={Colors?.primary || '#0f6b73'} />
          <Text style={{ marginTop: 12, color: '#666' }}>Initialisation…</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // MapSearch guard
  const MapSearchComponent = MapSearchScreen && typeof MapSearchScreen === 'function'
    ? MapSearchScreen
    : function MissingMapSearch() {
        return (
          <SafeAreaProvider>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', color: '#c0392b' }}>MapSearchScreen introuvable</Text>
              <Text>Vérifie que le fichier src/screens/MapSearchScreen.js existe et exporte default.</Text>
            </View>
          </SafeAreaProvider>
        );
      };

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} onReady={applyPendingResetIfAny}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {/* Déclarer TOUS les écrans racine ici (statique), ainsi reset vers Welcome/Student/Driver fonctionnera */}
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="StudentAuth" component={StudentAuthStack} />
          <RootStack.Screen name="DriverAuth" component={DriverAuthStack} />
          <RootStack.Screen name="Driver" component={DriverTabs} />
          <RootStack.Screen name="Student" component={StudentTabs} />
          <RootStack.Screen name="Messages" component={MessagesScreen} />
          <RootStack.Screen name="MapSearch" component={MapSearchComponent} />
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}