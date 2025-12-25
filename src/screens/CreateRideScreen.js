import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Layout } from '../theme';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CreateRideScreen({ navigation }) {
  const [origin, setOrigin] = useState('Campus - Entrée');
  const [destination, setDestination] = useState('');
  const [seats, setSeats] = useState('3');

  async function handleCreate() {
    try {
      if (!auth.currentUser) throw new Error('Utilisateur non connecté');
      const ridesRef = collection(db, 'rides');
      await addDoc(ridesRef, {
        ownerId: auth.currentUser.uid,
        origin,
        destination,
        seatsAvailable: Number(seats),
        createdAt: serverTimestamp(),
      });
      Alert.alert('Succès', 'Trajet créé');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible de créer le trajet');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Origine</Text>
        <TextInput value={origin} onChangeText={setOrigin} style={styles.input} />

        <Text style={[styles.label, { marginTop: 12 }]}>Destination</Text>
        <TextInput value={destination} onChangeText={setDestination} style={styles.input} />

        <Text style={[styles.label, { marginTop: 12 }]}>Places disponibles</Text>
        <TextInput value={seats} onChangeText={setSeats} style={styles.input} keyboardType="numeric" />

        <TouchableOpacity style={styles.btn} onPress={handleCreate}>
          <Text style={styles.btnText}>Créer le trajet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.soft, justifyContent: 'center' },
  card: { margin: Layout.padding, backgroundColor: Colors.white, borderRadius: Layout.cardRadius, padding: Layout.padding + 6 },
  label: { color: Colors.muted, fontSize: 12 },
  input: { backgroundColor: '#f6f8f6', padding: 12, borderRadius: 12, marginTop: 6 },
  btn: { marginTop: 16, backgroundColor: Colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: '700' },
});