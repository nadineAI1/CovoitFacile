import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { auth } from '../../firebase';
import { listenDriverProfile } from '../../services/drivers';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '../../theme';

export default function DriverRidesScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [profile, setProfile] = useState(null);
  const uid = auth.currentUser?.uid;
  const isFocused = useIsFocused();

  useEffect(() => {
    // profile realtime
    if (!uid) return;
    const unsubProfile = listenDriverProfile(uid, (p) => setProfile(p));
    return () => unsubProfile && unsubProfile();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'rides'), where('driverId', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      setRides(rows);
    }, err => {
      console.warn('rides onSnapshot', err);
      setRides([]);
    });
    return () => unsub();
  }, [uid, isFocused]);

  const setActiveRide = async (rideId) => {
    if (!uid) return Alert.alert('Non authentifié');
    try {
      const ridesQ = query(collection(db, 'rides'), where('driverId', '==', uid));
      const snap = await getDocs(ridesQ);
      const batch = writeBatch(db);
      snap.forEach((d) => {
        const rDoc = doc(db, 'rides', d.id);
        if (d.id === rideId) batch.update(rDoc, { isActive: true });
        else {
          const data = d.data();
          if (data && data.isActive) batch.update(rDoc, { isActive: false });
        }
      });
      await batch.commit();
      Alert.alert('Fait', 'Trajet activé pour le matching.');
    } catch (e) {
      console.warn('setActiveRide error', e);
      Alert.alert('Erreur', 'Impossible de définir le trajet actif.');
    }
  };

  const onDelete = async (rideId) => {
    Alert.alert('Confirmer', 'Supprimer ce trajet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'rides', rideId));
            Alert.alert('Supprimé');
          } catch (e) {
            console.warn('delete ride error', e);
            Alert.alert('Erreur', 'Impossible de supprimer le trajet.');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={{ fontWeight: '800' }}>{item.origin || 'Origine'} → {item.destination || 'Destination'}</Text>
      <Text>Points: {item.route ? item.route.length : 'N/A'}  •  Actif: {item.isActive ? 'Oui' : 'Non'}</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#2f9f7a' }]} onPress={() => setActiveRide(item.id)}>
          <Text style={{ color: '#fff' }}>Définir actif</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { marginLeft: 8 }]} onPress={() => navigation.navigate('DriverEditRide', { rideId: item.id })}>
          <Text>Editer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { marginLeft: 8, backgroundColor: '#fff', borderWidth: 1 }]} onPress={() => onDelete(item.id)}>
          <Text style={{ color: '#d9534f' }}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '800' }}>Mes trajets</Text>
          {profile ? <Text style={{ color: '#666' }}>{profile.name || 'Chauffeur' } • {profile.vehicleModel || '-'}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('DriverProfile')}>
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>Profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, { marginLeft: 8 }]} onPress={() => navigation.navigate('DriverCreateRide')}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>+ Nouveau</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList data={rides} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} ListEmptyComponent={<Text style={{ padding: 12 }}>Aucun trajet.</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBtn: { backgroundColor: '#eef6f8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  card: { backgroundColor: '#fff', padding: 12, marginBottom: 10, borderRadius: 10, elevation: 2, marginHorizontal: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f2f2f2' },
});