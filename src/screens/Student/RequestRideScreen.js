import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { auth } from '../../firebase';
import firestoreService from '../../services/firestore';

/**
 * RequestRideScreen (strict matching)
 * - Cherche rides STRICTS: même date (± dateToleranceHours) et emplacement (pickup/dest dans radii)
 * - Si des matches sont trouvés -> affiche la liste et permet de "Demander" sur un ride
 * - Sinon -> crée automatiquement une open request
 */

export default function RequestRideScreen({ navigation }) {
  const me = auth.currentUser?.uid || null;

  const [pickupLat, setPickupLat] = useState('36.81413778493265');
  const [pickupLng, setPickupLng] = useState('7.720215140421222');
  const [destLat, setDestLat] = useState('36.824199599191324');
  const [destLng, setDestLng] = useState('7.821317317995636');
  const [dateStr, setDateStr] = useState('2026-01-05T00:00:00Z'); // ISO obligatoire
  const [passengerCount, setPassengerCount] = useState('1');

  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [searchDone, setSearchDone] = useState(false);

  const parseFloatSafe = (s) => {
    const n = parseFloat(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const handleSearch = async () => {
    const originLat = parseFloatSafe(pickupLat);
    const originLng = parseFloatSafe(pickupLng);
    const destLatN = parseFloatSafe(destLat);
    const destLngN = parseFloatSafe(destLng);
    if (!originLat || !originLng || !destLatN || !destLngN) {
      return Alert.alert('Coordonnées invalides', 'Vérifie les lat/lng de pickup et destination.');
    }
    if (!dateStr) {
      return Alert.alert('Date requise', 'Merci de renseigner la date (format ISO, ex: 2026-01-05T00:00:00Z).');
    }
    if (!me) return Alert.alert('Non connecté', 'Connecte-toi pour créer une demande.');

    const origin = { lat: originLat, lng: originLng };
    const destination = { lat: destLatN, lng: destLngN };
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return Alert.alert('Date invalide', 'Le format de la date est invalide.');

    // strict params (modifiables)
    const dateToleranceHours = 2; // tolérance ±2h
    const pickupRadius = 800;     // mètres
    const destRadius = 800;       // mètres
    const maxResults = 50;

    setLoading(true);
    setMatches([]);
    setSearchDone(false);

    try {
      const params = {
        origin,
        destination,
        date: dateObj,
        dateToleranceHours,
        pickupRadius,
        destRadius,
        maxResults,
        permissive: false, // force comportement strict dans le matcher
      };

      // appel du precheck (utilise findMatchingRides via wrapper)
      const res = await firestoreService.findMatchingRidesForParams
        ? await firestoreService.findMatchingRidesForParams(params, maxResults)
        : await firestoreService.findMatchingRides(params);

      const matchesResult = Array.isArray(res) ? res : (res && res.matches ? res.matches : []);
      console.log('strict precheck result count=', matchesResult.length);

      if (matchesResult.length > 0) {
        setMatches(matchesResult);
        setSearchDone(true);
        return;
      }

      // Aucun match strict -> créer automatiquement une open request
      const extras = { origin, destination, date: dateObj };
      const reqId = await firestoreService.createRequest(null, me, Number(passengerCount || 1), '', extras);
      Alert.alert('Aucune correspondance', 'Aucune proposition trouvée — une demande ouverte a été créée.');
      navigation.navigate('RequestStatus', { requestId: reqId });

    } catch (e) {
      console.warn('strict search error', e);
      Alert.alert('Erreur', e?.message || 'Échec de la recherche.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOnRide = async (rideId) => {
    if (!me) return Alert.alert('Non connecté', 'Connecte-toi pour créer une demande.');
    Alert.alert('Confirmer', 'Demander sur ce trajet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Demander', onPress: async () => {
          setLoading(true);
          try {
            const reqId = await firestoreService.requestSeat(rideId, me, Number(passengerCount || 1), '');
            Alert.alert('Demande envoyée', `Request créée : ${reqId}`);
            navigation.navigate('RequestStatus', { requestId: reqId });
          } catch (e) {
            console.warn('requestSeat error', e);
            Alert.alert('Erreur', e?.message || 'Impossible de créer la demande sur ce trajet.');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const renderRideItem = ({ item }) => {
    const start = item.startLocation ? `${item.startLocation.lat.toFixed(5)},${item.startLocation.lng.toFixed(5)}` : (item.route && item.route[0] ? `${item.route[0].lat.toFixed(5)},${item.route[0].lng.toFixed(5)}` : 'N/A');
    const end = item.endLocation ? `${item.endLocation.lat.toFixed(5)},${item.endLocation.lng.toFixed(5)}` : (item.route && item.route.length ? `${item.route[item.route.length-1].lat.toFixed(5)},${item.route[item.route.length-1].lng.toFixed(5)}` : 'N/A');
    const dateLabel = item.date ? (item.date.toDate ? item.date.toDate().toLocaleString() : String(item.date)) : 'Sans date';
    const seats = (typeof item.seatsAvailable === 'number') ? item.seatsAvailable : (item.seats || 'N/A');

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{start} → {end}</Text>
          <Text style={styles.sub}>{dateLabel} • places: {seats}</Text>
          <Text style={styles.small}>driverId: {String(item.driverId || item.ownerId || '—')}</Text>
        </View>
        <View style={{ justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => handleRequestOnRide(item.id)} style={styles.actionBtn}>
            <Text style={styles.actionText}>Demander</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Trouver un trajet (strict)</Text>

      <Text style={styles.label}>Pickup (lat)</Text>
      <TextInput value={pickupLat} onChangeText={setPickupLat} style={styles.input} keyboardType="numeric" />

      <Text style={styles.label}>Pickup (lng)</Text>
      <TextInput value={pickupLng} onChangeText={setPickupLng} style={styles.input} keyboardType="numeric" />

      <Text style={styles.label}>Destination (lat)</Text>
      <TextInput value={destLat} onChangeText={setDestLat} style={styles.input} keyboardType="numeric" />

      <Text style={styles.label}>Destination (lng)</Text>
      <TextInput value={destLng} onChangeText={setDestLng} style={styles.input} keyboardType="numeric" />

      <Text style={styles.label}>Date (ISO, ex: 2026-01-05T00:00:00Z)</Text>
      <TextInput value={dateStr} onChangeText={setDateStr} style={styles.input} placeholder="2026-01-05T00:00:00Z" />

      <Text style={styles.label}>Nombre de passagers</Text>
      <TextInput value={String(passengerCount)} onChangeText={setPassengerCount} style={styles.input} keyboardType="numeric" />

      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity onPress={handleSearch} style={[styles.primaryBtn, { marginRight: 8 }]} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? '...' : 'Chercher (strict)'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 12 }} />

      {loading ? <ActivityIndicator /> : null}

      {searchDone && (
        <>
          <Text style={{ marginTop: 12, marginBottom: 8, fontWeight: '700' }}>Trajets proposés</Text>
          {matches.length === 0 ? (
            <Text style={{ color: '#666' }}>Aucun trajet strict trouvé — une demande ouverte a été créée automatiquement.</Text>
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(i) => i.id}
              renderItem={renderRideItem}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: '#444', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginTop: 4 },
  primaryBtn: { backgroundColor: '#0b6563', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  card: { padding: 12, backgroundColor: '#fff', borderRadius: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  title: { fontWeight: '700' },
  sub: { color: '#666', marginTop: 6 },
  small: { color: '#999', fontSize: 11, marginTop: 6 },
  actionBtn: { backgroundColor: '#0b6563', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  actionText: { color: '#fff', fontWeight: '700' },
});