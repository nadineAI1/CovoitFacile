import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { createRequestWithPrecheck, requestSeat, createRequest } from '../../services/firestore';
import { auth } from '../../firebase';

export default function RequestRideStrictScreen({ navigation }) {
  const [origin, setOrigin] = useState({ lat: 36.8140628826439, lng: 7.720277374040842 }); // remplacer par pickers
  const [destination, setDestination] = useState({ lat: 36.824232033626394, lng: 7.821296969915551 });
  const [date, setDate] = useState(new Date('2026-01-16T00:00:00'));
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null); // null = pas encore cherché, [] = aucun match
  const [passengerCount, setPassengerCount] = useState(1);
  const me = auth.currentUser;

  const onSearch = async () => {
    if (!me) return Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
    setLoading(true);
    setMatches(null);
    try {
      // Important: autoCreateOpen=false -> on ne crée pas automatiquement une open request
      const res = await createRequestWithPrecheck(null, me.uid, passengerCount, '', { origin, destination, date }, { permissive: false, autoCreateOpen: false, permissiveFallback: false });
      console.log('precheck result', res);
      if (res.matched) {
        setMatches(res.matches || []);
      } else {
        setMatches([]); // aucun match
      }
    } catch (e) {
      console.warn('search error', e);
      Alert.alert('Erreur', 'Impossible de chercher des trajets.');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const onRequestRide = async (ride) => {
    if (!me) return Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
    setLoading(true);
    try {
      // Envoie la demande SUR CE ride (status = pending)
      const id = await requestSeat(ride.id || ride.rideId, me.uid, passengerCount, '');
      Alert.alert('Demande envoyée', 'Ta demande a été envoyée au conducteur.');
      navigation.navigate('RequestStatus', { requestId: id });
    } catch (e) {
      console.warn('requestSeat error', e);
      Alert.alert('Erreur', e?.message || 'Impossible d\'envoyer la demande.');
    } finally {
      setLoading(false);
    }
  };

  const onCreateOpenRequest = async () => {
    if (!me) return Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
    Alert.alert('Créer une demande ouverte', 'Aucun trajet trouvé — veux-tu créer une demande ouverte visible par tous les conducteurs ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Créer', onPress: async () => {
          setLoading(true);
          try {
            const requestId = await createRequest(me.uid, passengerCount, '', { origin, destination, date });
            Alert.alert('Demande ouverte créée', 'La demande est visible par les conducteurs.');
            navigation.navigate('RequestStatus', { requestId });
          } catch (e) {
            console.warn('createRequest error', e);
            Alert.alert('Erreur', e?.message || 'Impossible de créer la demande.');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Chercher un trajet</Text>

      {/* Ici tu as normalement des pickers pour origin/destination/date */}
      <Text>Origin: {origin.lat}, {origin.lng}</Text>
      <Text>Destination: {destination.lat}, {destination.lng}</Text>
      <Text>Date: {date.toLocaleString()}</Text>

      <View style={{ marginVertical: 10 }}>
        <Button title="Rechercher" onPress={onSearch} disabled={loading} />
      </View>

      {loading && <ActivityIndicator />}

      {matches === null ? null : (
        <>
          {matches.length > 0 ? (
            <>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Trajets trouvés ({matches.length})</Text>
              <FlatList
                data={matches}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => (
                  <View style={{ padding: 12, backgroundColor: '#fff', marginBottom: 8, borderRadius: 8 }}>
                    <Text style={{ fontWeight: '700' }}>{item.driverName || item.driverId || 'Conducteur'}</Text>
                    <Text>{item.startLocation?.label || item.origin?.label || 'Départ'} → {item.endLocation?.label || item.destination?.label || 'Arrivée'}</Text>
                    <Text>Places: {item.seats || item.seatsAvailable || '—'}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      <TouchableOpacity onPress={() => onRequestRide(item)} style={{ backgroundColor: '#2f9f7a', padding: 8, borderRadius: 6, marginRight: 8 }}>
                        <Text style={{ color: '#fff' }}>Demander</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </>
          ) : (
            <>
              <Text style={{ marginTop: 10, color: '#666' }}>Aucun trajet trouvé.</Text>
              <View style={{ marginTop: 8 }}>
                <Button title="Créer une demande ouverte" onPress={onCreateOpenRequest} disabled={loading} />
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}