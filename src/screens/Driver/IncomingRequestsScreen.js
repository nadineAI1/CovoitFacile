import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listenRequestsForRide,
  acceptRequestAndCreateConversation,
  rejectRequestForRide,
  getUserProfile,
} from '../../services/firestore';
import { auth } from '../../firebase';

export default function IncomingRequestsScreen({ route, navigation }) {
  const { rideId } = route.params || {};
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState({});

  const me = auth.currentUser;

  useEffect(() => {
    if (!rideId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenRequestsForRide(rideId, async (rows) => {
      try {
        const enriched = await Promise.all(rows.map(async (r) => {
          let profile = null;
          try { profile = await getUserProfile(r.userId); } catch (e) { console.warn('getUserProfile failed', e); }
          return { ...r, userProfile: profile };
        }));
        setRequests(enriched);
      } catch (e) {
        console.warn('Error enriching requests', e);
        setRequests(rows);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.warn('listenRequestsForRide error', err);
      setLoading(false);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [rideId]);

  const onAccept = async (req) => {
    if (!me) return Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
    setLoadingMap(prev => ({ ...prev, [req.id]: true }));
    try {
      const res = await acceptRequestAndCreateConversation(req.id, me.uid, 'Bonjour, je vous prends.');
      Alert.alert('Accepté', 'La demande a été acceptée.');
      if (res?.conversationId) navigation.navigate('Chat', { conversationId: res.conversationId });
    } catch (e) {
      console.warn('accept error', e);
      Alert.alert('Erreur', e?.message || 'Impossible d\'accepter la demande.');
    } finally {
      setLoadingMap(prev => ({ ...prev, [req.id]: false }));
    }
  };

  const onReject = async (req) => {
    if (!me) return Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
    setLoadingMap(prev => ({ ...prev, [req.id]: true }));
    try {
      await rejectRequestForRide(req.id, me.uid);
      Alert.alert('Rejeté', 'La demande a été rejetée.');
    } catch (e) {
      console.warn('reject error', e);
      Alert.alert('Erreur', e?.message || 'Impossible de rejeter la demande.');
    } finally {
      setLoadingMap(prev => ({ ...prev, [req.id]: false }));
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.userProfile?.displayName || item.userId}</Text>
      <Text style={{ color: '#666' }}>{item.passengerCount || 1} place(s) • {item.note || '—'}</Text>
      <Text style={{ marginTop: 8, fontWeight: '700', color: item.status === 'pending' ? '#FF8C00' : (item.status === 'accepted' ? 'green' : 'gray') }}>{(item.status || '').toUpperCase()}</Text>

      {item.status === 'pending' && (
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(item)} disabled={loadingMap[item.id]}>
            {loadingMap[item.id] ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Accepter</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(item)} disabled={loadingMap[item.id]}>
            <Text>Refuser</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status !== 'pending' && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color:'#666' }}>Créée: {item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleString() : '—'}</Text>
          {item.origin ? <Text>Origine: {typeof item.origin === 'string' ? item.origin : (item.origin.label || `${item.origin.lat},${item.origin.lng}`)}</Text> : null}
          {item.destination ? <Text>Destination: {typeof item.destination === 'string' ? item.destination : (item.destination.label || `${item.destination.lat},${item.destination.lng}`)}</Text> : null}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f6f6f6', padding:12 }}>
      <Text style={{ fontWeight:'800', fontSize:18, marginBottom:8 }}>Demandes entrantes</Text>

      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={requests}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{ color: '#666', marginTop: 8 }}>Aucune demande pour ce trajet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10 },
  title: { fontWeight:'800', marginBottom:4 },
  acceptBtn: { backgroundColor: '#2f9f7a', padding:8, borderRadius:6, marginRight:8 },
  rejectBtn: { padding:8, borderRadius:6, borderWidth:1, borderColor:'#ddd' },
});