import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme';

export default function RideCard({ ride, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(ride)} activeOpacity={0.85}>
      <View style={styles.left}>
        <Text style={styles.route}>{ride.origin} → {ride.destination}</Text>
        <Text style={styles.meta}>{ride.depart}</Text>
        <Text style={styles.driver}>Conducteur · {ride.driverName || '—'}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{ride.price ?? 0}€</Text>
        <Text style={styles.seats}>{ride.seatsAvailable ?? ride.seats} places</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  left: { flex: 1, paddingRight: 8 },
  route: { fontSize: 16, fontWeight: '700', color: Colors.text },
  meta: { color: Colors.muted, marginTop: 4 },
  driver: { marginTop: 8, color: '#444', fontSize: 13 },
  right: { alignItems: 'flex-end', width: 90 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  seats: { color: Colors.muted, marginTop: 6 },
});