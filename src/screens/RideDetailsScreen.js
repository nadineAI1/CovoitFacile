import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import { doc, getDoc, runTransaction, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';

export default function RideDetailsScreen({ route }) {
  const { rideId } = route.params;
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = doc(db, 'rides', rideId);
    getDoc(ref).then((d) => {
      if (d.exists()) setRide({ id: d.id, ...d.data() });
      else Alert.alert('Introuvable', 'Trajet introuvable');
    }).catch((e) => {
      Alert.alert('Erreur', e.message);
    });
  }, [rideId]);

  const joinRide = async () => {
    if (!ride) return;
    const uid = auth.currentUser.uid;
    const ref = doc(db, 'rides', rideId);

    setLoading(true);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('Le trajet n’existe plus');
        const data = snap.data();

        if (data.ownerId === uid) throw new Error('Tu es le propriétaire de ce trajet');
        const passengers = data.passengers || [];
        const seats = Number(data.seatsAvailable ?? 0);

        if (passengers.includes(uid)) throw new Error('Tu as déjà rejoint ce trajet');
        if (seats <= 0) throw new Error('Plus de places disponibles');

        tx.update(ref, {
          passengers: arrayUnion(uid),
          seatsAvailable: increment(-1)
        });
      });

      Alert.alert('Succès', 'Tu as rejoint le trajet');
      const newSnap = await getDoc(ref);
      setRide({ id: newSnap.id, ...newSnap.data() });
    } catch (e) {
      Alert.alert('Impossible de rejoindre', e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!ride) return null;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>{ride.origin} → {ride.destination}</Text>
      {ride.datetime?.seconds ? (
        <Text>{new Date(ride.datetime.seconds * 1000).toLocaleString()}</Text>
      ) : <Text>{ride.datetime?.toString?.() ?? ''}</Text>}
      <Text>Places: {ride.seatsAvailable}</Text>
      <Text>Prix: ${ride.price ?? 0}</Text>
      {ride.pickupPoints?.length ? (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: '600' }}>Points de prise :</Text>
          {ride.pickupPoints.map((p, i) => (
            <Text key={i}>- {p}</Text>
          ))}
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : (
        <Button title="Rejoindre" onPress={joinRide} />
      )}
    </View>
  );
}