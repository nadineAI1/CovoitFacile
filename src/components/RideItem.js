import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme';

export default function RideItem({ ride, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View>
        <Text style={styles.route}>{ride.origin} → {ride.destination}</Text>
        <Text style={styles.meta}>{ride.date} {ride.time || ''} • {ride.seatsAvailable}/{ride.seatsTotal} places</Text>
      </View>
      <Text style={styles.price}>{ride.price ? `${ride.price} FCFA` : ''}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor:'#fff', padding:12, borderRadius:10, marginBottom:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  route: { fontWeight:'700', color: Colors.text },
  meta: { color: '#666', marginTop:4 },
  price: { color: Colors.primary, fontWeight:'700' }
});