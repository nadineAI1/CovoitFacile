import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Layout } from '../theme';
import { useNavigation } from '@react-navigation/native';

export default function RideBottomSheet() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Où voulez-vous aller ?</Text>

      <View style={styles.card}>
        <Text style={styles.label}>De</Text>
        <Text style={styles.location}>Campus - Entrée principale</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>À</Text>
        <Text style={styles.location}>Bibliothèque centrale</Text>

        <Text style={styles.price}>Estimation : $2.50</Text>

        <TouchableOpacity style={styles.requestBtn} onPress={() => navigation.navigate('CreateRide')}>
          <Text style={styles.requestText}>Demander une prise en charge</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Layout.padding / 2, flex: 1 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  card: { backgroundColor: Colors.white, borderRadius: Layout.cardRadius, padding: Layout.padding, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 },
  label: { color: Colors.muted, fontSize: 12 },
  location: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  price: { marginTop: 8, fontSize: 18, fontWeight: '700', color: Colors.primary },
  requestBtn: { marginTop: 14, backgroundColor: Colors.primary, padding: 12, borderRadius: 12, alignItems: 'center' },
  requestText: { color: Colors.white, fontWeight: '700' },
});