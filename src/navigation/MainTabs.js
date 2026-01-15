import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import CreateRideScreen from '../screens/CreateRideScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RideDetailsScreen from '../screens/RideDetailsScreen';
import { TouchableOpacity, Text } from 'react-native';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function MainTabs() {

  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff' }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Trajets' }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Carte' }} />
      <Stack.Screen name="Create" component={CreateRideScreen} options={{ title: 'Proposer un trajet' }} />
      <Stack.Screen name="RideDetails" component={RideDetailsScreen} options={{ title: 'Détails du trajet' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Mon profil' }} />
    </Stack.Navigator>
  );
}