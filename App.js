import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MapScreen from './src/screens/MapScreen';
import CreateRideScreen from './src/screens/CreateRideScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { auth } from './src/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { StatusBar } from 'react-native';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="CreateRide" component={CreateRideScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}