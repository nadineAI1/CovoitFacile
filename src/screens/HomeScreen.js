import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function HomeScreen({ navigation, user }) {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'rides'), orderBy('datetime', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRides(data);
    });
    return unsub;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Button title="Créer un trajet" onPress={() => navigation.navigate('CreateRide')} />
      <Button title="Ouvrir la carte" onPress={() => navigation.navigate('Map')} />
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('RideDetails', { rideId: item.id })}>
            <Text style={styles.title}>{item.origin} → {item.destination}</Text>
            <Text>{item.datetime?.seconds ? new Date(item.datetime.seconds * 1000).toLocaleString() : ''}</Text>
            <Text>Places: {item.seatsAvailable} • Prix: ${item.price ?? 0}</Text>
            {item.recurring ? <Text style={{ color: 'green' }}>Récurrent: {item.recurring}</Text> : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ padding: 20 }}>Aucun trajet disponible</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontWeight: '600' }
});