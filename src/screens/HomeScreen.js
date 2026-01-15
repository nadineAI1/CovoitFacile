// updated HomeScreen: use DateSelector and remove automatic "Demande envoyée" alert
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateSelector from '../components/DateSelector';
import * as Location from 'expo-location';
import { auth } from '../firebase';
import { createRequest } from '../services/firestore'; // use firestore service
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [pickup, setPickup] = useState(null);
  const [pickupLabel, setPickupLabel] = useState('');
  const [destination, setDestination] = useState(null);
  const [destinationLabel, setDestinationLabel] = useState('');
  const [mode, setMode] = useState(null);
  const [date, setDate] = useState(null);
  const [sending, setSending] = useState(false);
  const mapRef = useRef(null);

  const onMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (mode === 'pickup') {
      const label = `Pickup ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setPickup({ lat: latitude, lng: longitude, label });
      setPickupLabel(label);
      setMode(null);
    } else if (mode === 'destination') {
      const label = `Dest ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setDestination({ lat: latitude, lng: longitude, label });
      setDestinationLabel(label);
      setMode(null);
    }
  };

  const useCurrentLocationAsPickup = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission refusée'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      let label = `Ma position (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          const parts = [place.name, place.street, place.city, place.region].filter(Boolean);
          if (parts.length) label = parts.join(', ');
        }
      } catch (e) {}
      setPickup({ lat: latitude, lng: longitude, label }); setPickupLabel(label);
    } catch (e) { console.warn(e); Alert.alert('Erreur', 'Impossible de récupérer la position.'); }
  };

  const handleFindDriver = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return Alert.alert('Connecte-toi');
    if (!pickup) return Alert.alert('Sélectionne un point de prise en charge.');
    if (!destination) return Alert.alert('Sélectionne une destination.');
    if (!date) return Alert.alert('Sélectionne une date.');

    setSending(true);
    try {
      const payload = {
        userId: uid,
        pickup,
        destination,
        date: date instanceof Date ? date : new Date(date),
        status: 'open',
      };
      const requestId = await createRequest(null, uid, 1, '', { origin: pickup, destination });
      // No automatic Alert displayed. Navigate to RequestStatus.
      navigation.navigate('RequestStatus', { requestId });
    } catch (e) {
      console.warn(e);
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView ref={mapRef} style={{ flex: 1 }} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} initialRegion={{ latitude: pickup?.lat || 36.9000, longitude: pickup?.lng || 7.7667, latitudeDelta: 0.05, longitudeDelta: 0.05 }} onPress={onMapPress} showsUserLocation>
        {pickup && <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} pinColor="green" title="Pickup" description={pickup.label} />}
        {destination && <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} pinColor="blue" title="Destination" description={destination.label} />}
      </MapView>

      <View style={styles.sheet}>
        <Text style={styles.title}>Demande de trajet</Text>

        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="Pickup label" value={pickupLabel} onChangeText={setPickupLabel} />
          <TouchableOpacity style={styles.setBtn} onPress={() => { setMode('pickup'); Alert.alert('Définir pickup', 'Appuie sur la carte pour définir le pickup'); }}>
            <Text style={styles.setBtnText}>Définir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.setBtn, { marginLeft: 6, backgroundColor: '#2f9f7a' }]} onPress={useCurrentLocationAsPickup}>
            <Ionicons name="locate" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="Destination label" value={destinationLabel} onChangeText={setDestinationLabel} />
          <TouchableOpacity style={styles.setBtn} onPress={() => { setMode('destination'); Alert.alert('Définir destination', 'Appuie sur la carte pour définir la destination'); }}>
            <Text style={styles.setBtnText}>Définir</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginVertical: 8 }}>
          <DateSelector date={date} onChange={(d) => setDate(d)} />
        </View>

        <TouchableOpacity style={styles.sendBtn} onPress={handleFindDriver} disabled={sending}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{sending ? 'Envoi...' : 'Trouver un chauffeur'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 10, right: 10, bottom: 16, backgroundColor: '#fff', padding: 12, borderRadius: 12, elevation: 6 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#eee', padding: 8, borderRadius: 8, marginRight: 8 },
  setBtn: { backgroundColor: '#0b6563', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  setBtnText: { color: '#fff', fontWeight: '700' },
  sendBtn: { backgroundColor: '#2f9f7a', padding: 14, alignItems: 'center', borderRadius: 10 },
});