import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import {
  getRide,
  requestSeat,
  listenRequestsForRide,
  // remplace acceptRequest par la fonction qui accepte ET crée la conversation
  acceptRequestAndCreateConversation,
  rejectRequestForRide,
  buildConversationId,
  findRequestsByUserForRide,
  sendMessage,
} from '../services/firestore';
import { auth } from '../firebase';

export default function RideDetailsScreen({ route, navigation }) {
  const { rideId: paramRideId, ride: routeRide } = route.params || {};
  const [ride, setRide] = useState(routeRide || null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [loadingMap, setLoadingMap] = useState({});
  const me = auth.currentUser;

  useEffect(() => {
    let unsubReq = null;
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const r = ride || (paramRideId ? await getRide(paramRideId) : null);
        if (!mounted) return;
        setRide(r);
        if (r && r.driverId === me.uid) {
          unsubReq = listenRequestsForRide(r.id, async (rows) => {
            setRequests(rows);
          });
        } else {
          if (r) {
            const existing = await findRequestsByUserForRide(r.id, me.uid);
            setRequests(existing);
          }
        }
      } catch (e) {
        console.warn('RideDetails load error', e);
        Alert.alert('Erreur', e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (unsubReq) unsubReq();
    };
   
  }, [paramRideId]);


  const onRequest = async () => {
    try {
      if (!ride) return Alert.alert('Erreur', 'Trajet introuvable');
      const existing = await findRequestsByUserForRide(ride.id, me.uid);
      if (existing && existing.length > 0) return Alert.alert('Déjà demandé', 'Tu as déjà une demande pour ce trajet.');
      const passengerCount = 1;
      const requestId = await requestSeat(ride.id, me.uid, passengerCount, '');

      navigation.navigate('RequestStatus', { requestId });
    } catch (e) {
      Alert.alert('Erreur', e.message || String(e));
    }
  };

  const onAccept = async (req) => {
    try {
      setLoadingMap(prev => ({ ...prev, [req.id]: true }));
      const { conversationId } = await acceptRequestAndCreateConversation(req.id, me.uid);
      Alert.alert('Demande acceptée', 'Le passager a été informé.');

      try {
        navigation.navigate('Chat', { conversationId, title: 'Conversation' });
      } catch (e) {
        try { navigation.getParent()?.navigate('Chat', { conversationId, title: 'Conversation' }); } catch (err) { /* ignore */ }
      }
      setLoadingMap(prev => ({ ...prev, [req.id]: false }));
    } catch (e) {
      setLoadingMap(prev => ({ ...prev, [req.id]: false }));
      Alert.alert('Erreur', e.message || String(e));
    }
  };

  const onReject = async (req) => {
    try {
      setLoadingMap(prev => ({ ...prev, [req.id]: true }));
      await rejectRequestForRide(req.id, me.uid);
      Alert.alert('Demande rejetée');
      setLoadingMap(prev => ({ ...prev, [req.id]: false }));
    } catch (e) {
      setLoadingMap(prev => ({ ...prev, [req.id]: false }));
      Alert.alert('Erreur', e.message || String(e));
    }
  };

  const onSendMessage = async (toUserId) => {
    if (!messageText.trim()) return;
    try {
      const convoId = buildConversationId(ride.id, me.uid, toUserId);
      await sendMessage(convoId, me.uid, toUserId, messageText.trim());
      setMessageText('');
      Alert.alert('Message envoyé');
      try {
        navigation.navigate('Chat', { conversationId: convoId, title: 'Conversation' });
      } catch (e) {
        try { navigation.getParent()?.navigate('Chat', { conversationId: convoId }); } catch (err) {}
      }
    } catch (e) {
      Alert.alert('Erreur', e.message || String(e));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!ride) return (
    <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: Colors.background }}>
      <Text>Trajet introuvable</Text>
    </SafeAreaView>
  );

  const isDriver = ride.driverId === me.uid;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.header}>
        <Text style={styles.title}>{ride.origin} → {ride.destination}</Text>
        <Text style={styles.subtitle}>{ride.date || ride.depart} • {ride.price ? `${ride.price}€` : '—'} • {ride.seatsAvailable} places</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Détails</Text>
        <Text>{ride.vehicle || '—'}</Text>

        {!isDriver ? (
          <>
            <TouchableOpacity style={styles.requestBtn} onPress={onRequest}>
              <Text style={styles.requestText}>Demander une place</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Demandes</Text>
            <FlatList
              data={requests}
              keyExtractor={(i)=>i.id}
              renderItem={({item})=>(
                <View style={styles.requestRow}>
                  <View style={{flex:1}}>
                    <Text style={{fontWeight:'700'}}>{item.userId}</Text>
                    <Text style={{color:'#666'}}>{item.passengerCount} place(s) • {new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt || Date.now()).toLocaleString()}</Text>
                    <Text style={{marginTop:6, fontWeight:'700', color: item.status === 'pending' ? '#FF8C00' : (item.status === 'accepted' ? 'green' : 'gray') }}>{item.status}</Text>
                  </View>
                  {item.status === 'pending' && (
                    <View style={{flexDirection:'row'}}>
                      <TouchableOpacity style={styles.acceptBtn} onPress={()=>onAccept(item)} disabled={loadingMap[item.id]}>
                        {loadingMap[item.id] ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff'}}>Accepter</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={()=>onReject(item)} disabled={loadingMap[item.id]}>
                        <Text>Refuser</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={{color: Colors.muted}}>Aucune demande</Text>}
            />
          </>
        )}

        <View style={{marginTop:20}}>
          <Text style={styles.sectionTitle}>{isDriver ? 'Contacter le passager' : 'Contacter le conducteur'}</Text>
          <TextInput placeholder="Message..." value={messageText} onChangeText={setMessageText} style={styles.msgInput} />
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => onSendMessage(isDriver ? (requests[0]?.userId || '') : ride.driverId)}
          >
            <Text style={{color:'#fff'}}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.muted, marginTop: 6 },

  content: { padding: 16 },
  sectionTitle: { fontWeight: '700', marginTop: 12, marginBottom: 8 },
  requestBtn: { marginTop: 12, backgroundColor: Colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  requestText: { color: '#fff', fontWeight: '800' },
  requestRow: { backgroundColor:'#fff', padding:10, borderRadius:8, marginBottom:8, flexDirection:'row', alignItems:'center' },
  acceptBtn: { backgroundColor: Colors.primary, padding:8, borderRadius:6, marginRight:6 },
  rejectBtn: { padding:8, borderRadius:6, borderWidth:1, borderColor:'#ddd' },

  msgInput: { backgroundColor:'#fff', padding:10, borderRadius:8, marginBottom:8 },
  msgBtn: { backgroundColor: Colors.primary, padding:10, borderRadius:8, alignItems:'center' }
});