import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Colors } from '../theme';

export default function MapScreen({ navigation }) {
  const handlePropose = () => {
    try {
      const rootNav = navigation.getRoot ? navigation.getRoot() : navigation;
      const state = rootNav && rootNav.getState ? rootNav.getState() : null;
      if (state && Array.isArray(state.routes)) {
        const hasStudent = state.routes.some((r) => r.name === 'Student');
        const hasDriver = state.routes.some((r) => r.name === 'Driver');
        if (hasStudent) {
          rootNav.navigate('Student', { screen: 'Create' });
          return;
        } else if (hasDriver) {
          rootNav.navigate('Driver', { screen: 'Create' });
          return;
        }
      }
      navigation.navigate('Create');
    } catch (e) {
      console.warn('navigate to Create failed', e);
      try { navigation.navigate('Create'); } catch (err) { console.warn('final fallback navigate failed', err); }
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 48.8566,
          longitude: 2.3522,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        <Marker coordinate={{ latitude: 48.8566, longitude: 2.3522 }} title="Paris" description="Exemple" />
      </MapView>

      <TouchableOpacity style={styles.fab} onPress={handlePropose}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Proposer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  fab: { position: 'absolute', right: 18, bottom: 24, backgroundColor: Colors.primary, padding: 12, borderRadius: 8, elevation: 6 },
});