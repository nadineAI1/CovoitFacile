import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, View } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import RequestRideStrictScreen from '../screens/Student/RequestRideStrictScreen'; // <-- strict screen
import RequestStatusScreen from '../screens/Student/RequestStatusScreen';
import RideDetailsScreen from '../screens/RideDetailsScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import CreateRideScreen from '../screens/Driver/DriverCreateRideScreen';
import ConversationsScreen from '../screens/Conversations/ConversationsScreen';

import LogoutButton from '../components/LogoutButton';

const Stack = createNativeStackNavigator();

function HeaderRight({ navigation }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Conversations')}
        style={{ marginRight: 12, paddingHorizontal: 8, paddingVertical: 6 }}
      >
        <Text style={{ color: '#007aff', fontWeight: '600' }}>Messages</Text>
      </TouchableOpacity>
      <LogoutButton navigation={navigation} redirect="Welcome" />
    </View>
  );
}

export default function StudentTabs() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Accueil',
          headerShown: true,
          headerRight: () => <HeaderRight navigation={navigation} />
        })}
      />

      <Stack.Screen
        name="Create"
        component={CreateRideScreen}
        options={({ navigation }) => ({
          title: 'Proposer un trajet',
          headerShown: true,
          headerRight: () => <LogoutButton navigation={navigation} redirect="Welcome" />
        })}
      />

      <Stack.Screen
        name="RideDetails"
        component={RideDetailsScreen}
        options={({ navigation }) => ({
          title: 'Détails du trajet',
          headerShown: true,
          headerRight: () => <LogoutButton navigation={navigation} redirect="Welcome" />
        })}
      />

      <Stack.Screen
        name="RequestRide"
        component={RequestRideStrictScreen}
        options={({ navigation }) => ({
          title: 'Trouver un trajet',
          headerShown: true,
          headerRight: () => <LogoutButton navigation={navigation} redirect="Welcome" />
        })}
      />

      <Stack.Screen
        name="RequestStatus"
        component={RequestStatusScreen}
        options={{ title: 'Statut de la demande', headerShown: true }}
      />

      <Stack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{ title: 'Conversations', headerShown: true }}
      />

      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat', headerShown: true }}
      />
    </Stack.Navigator>
  );
}