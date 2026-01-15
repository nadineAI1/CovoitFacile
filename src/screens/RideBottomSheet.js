import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme';


export default function RideBottomSheet({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Options rapides</Text>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('CreateRide')}>
        <Text style={styles.rowText}>Proposer un trajet</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.rowText}>Voir les trajets disponibles</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowText}>Partager ma position</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowText: { color: Colors.primary, fontWeight: '700' },
});