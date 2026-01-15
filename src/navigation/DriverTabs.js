import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MapScreen from '../screens/MapScreen';
import DriverRidesScreen from '../screens/Driver/DriverRidesScreen';
import DriverCreateRideScreen from '../screens/Driver/DriverCreateRideScreen';
import DriverProfileScreen from '../screens/Driver/DriverProfileScreen';
import VerificationScreen from '../screens/Driver/VerificationScreen';
import IncomingRequestsScreen from '../screens/Driver/IncomingRequestsScreen';
import OpenRequestsScreen from '../screens/Driver/OpenRequestsScreen';
import RideDetailsScreen from '../screens/RideDetailsScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import DriverEditRideScreen from '../screens/Driver/DriverEditRideScreen';

import ConversationsScreen from '../screens/Conversations/ConversationsScreen'; // <-- nouvel écran Conversations
import LogoutButton from '../components/LogoutButton';

const Stack = createNativeStackNavigator();

function RequestsButton({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('OpenRequests')} style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: '#0b6563', fontWeight: '700' }}>Demandes</Text>
    </TouchableOpacity>
  );
}

function MessagesButton({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Conversations')} style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: '#0b6563', fontWeight: '700' }}>Messages</Text>
    </TouchableOpacity>
  );
}

export default function DriverTabs() {
  return (
    <Stack.Navigator>
      {/* Main driver map / dashboard — on affiche l'en‑tête pour y placer les boutons */}
      <Stack.Screen
        name="DriverHome"
        component={MapScreen}
        options={({ navigation }) => ({
          title: 'Tableau de bord',
          headerShown: true,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RequestsButton navigation={navigation} />
              <MessagesButton navigation={navigation} />
              <LogoutButton navigation={navigation} redirect="Welcome" />
            </View>
          ),
        })}
      />

      {/* Driver flows (pas d'en-tête par défaut) */}
      <Stack.Screen name="DriverRides" component={DriverRidesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DriverCreateRide" component={DriverCreateRideScreen} options={({ navigation }) => ({ headerShown: true, title: 'Créer un trajet', headerRight: () => <LogoutButton navigation={navigation} redirect="Welcome" /> })} />
      <Stack.Screen name="Create" component={DriverCreateRideScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DriverEditRide" component={DriverEditRideScreen} options={{ headerShown: true, title: 'Modifier le trajet' }} />

      {/* Profile & verification */}
      <Stack.Screen name="DriverProfile" component={DriverProfileScreen} options={{ headerShown: true, title: 'Profil' }} />
      <Stack.Screen name="DriverVerification" component={VerificationScreen} options={{ headerShown: true, title: 'Vérification' }} />

      {/* Nouveau : OpenRequests (file globale des demandes ouvertes) */}
      <Stack.Screen name="OpenRequests" component={OpenRequestsScreen} options={({ navigation }) => ({ headerShown: true, title: 'Demandes ouvertes', headerRight: () => <LogoutButton navigation={navigation} redirect="Welcome" /> })} />

      {/* Incoming requests for active ride (existant) */}
      <Stack.Screen name="IncomingRequests" component={IncomingRequestsScreen} options={({ navigation }) => ({ headerShown: true, title: 'Demandes entrantes', headerRight: () => <LogoutButton navigation={navigation} redirect="Welcome" /> })} />

      {/* Conversations (inbox) */}
      <Stack.Screen name="Conversations" component={ConversationsScreen} options={({ navigation }) => ({ headerShown: true, title: 'Conversations', headerRight: () => <LogoutButton navigation={navigation} redirect="Welcome" /> })} />

      {/* Shared / details */}
      <Stack.Screen name="RideDetails" component={RideDetailsScreen} options={{ headerShown: true, title: 'Détails du trajet' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: 'Chat' }} />
    </Stack.Navigator>
  );
}