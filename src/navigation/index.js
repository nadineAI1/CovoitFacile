import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateRideScreen from '../screens/CreateRideScreen';
import RideDetailsScreen from '../screens/RideDetailsScreen';
import MapScreen from '../screens/MapScreen';

const Stack = createNativeStackNavigator();

export default function MainStack({ user }) {
  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Home">
            {(props) => <HomeScreen {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="CreateRide" component={CreateRideScreen} options={{ title: 'Create Ride' }} />
          <Stack.Screen name="RideDetails" component={RideDetailsScreen} options={{ title: 'Ride Details' }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
        </>
      )}
    </Stack.Navigator>
  );
}