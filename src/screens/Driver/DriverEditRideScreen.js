import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Placeholder DriverEditRideScreen
 * - Simple écran placeholder pour éviter les erreurs d'import si le fichier manquant casse la navigation.
 * - Tu peux remplacer ce fichier par ta vraie implémentation d'édition de trajet plus tard.
 */

export default function DriverEditRideScreen({ route, navigation }) {
  const rideId = route?.params?.rideId;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Éditer le trajet</Text>
      <Text style={styles.text}>Ride ID: {rideId || '—'}</Text>

      <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  text: { color: '#666', marginBottom: 24 },
  btn: { backgroundColor: '#2f9f7a', padding: 12, borderRadius: 8 },
});