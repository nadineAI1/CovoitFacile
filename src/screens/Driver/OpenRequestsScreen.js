import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import firestoreService from '../../services/firestore';
import { auth } from '../../firebase';

const userCache = new Map();

async function loadUserProfile(uid) {
  if (!uid) return null;
  if (userCache.has(uid)) return userCache.get(uid);
  try {
    const p = await firestoreService.getUserProfile(uid);
    const profile = p ? { id: uid, name: p.name || p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || null, phone: p.phone || p.phoneNumber || null, role: p.role || null } : { id: uid, name: null, phone: null, role: null };
    userCache.set(uid, profile);
    return profile;
  } catch (e) {
    userCache.set(uid, { id: uid, name: null, phone: null, role: null });
    return { id: uid, name: null, phone: null, role: null };
  }
}

export default function OpenRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const [actionLoading, setActionLoading] = useState({});
  const [myProfile, setMyProfile] = useState(null);
  const me = auth.currentUser?.uid || null;

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!me) return;
      try {
        const prof = await loadUserProfile(me);
        if (!cancelled) setMyProfile(prof);
      } catch (e) {}
    })();
    return () => { cancelled = true; };
  }, [me]);

  useEffect(() => {
    setLoading(true);
    const unsub = firestoreService.listenOpenRequests(async (rows) => {
      if (!mountedRef.current) return;
      if (!rows || rows.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }
      const uniqUserIds = Array.from(new Set(rows.map(r => r.userId).filter(Boolean)));
      await Promise.all(uniqUserIds.map(uid => loadUserProfile(uid)));
      if (!mountedRef.current) return;
      const withNames = rows.map(r => {
        const prof = r.userId ? userCache.get(r.userId) : null;
        return { ...r, __requesterName: prof ? (prof.name || prof.phone || prof.id) : (r.userId || 'Utilisateur') };
      });
      setRequests(withNames);
      setLoading(false);
    }, (err) => {
      console.warn('listenOpenRequests error', err);
      if (mountedRef.current) setLoading(false);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const openDetails = (req) => navigation.navigate('RideDetails', { requestId: req.id });

  const handleAccept = async (req) => {
    if (!me) return Alert.alert('Erreur', 'Utilisateur non connecté.');
    Alert.alert('Confirmer', 'Accepter cette demande ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Accepter', onPress: async () => {
          setActionLoading(prev => ({ ...prev, [req.id]: true }));
          try {
            const res = await firestoreService.acceptRequestAndCreateConversation(req.id, me, 'Bonjour, je vous prends.');
            if (res?.conversationId) navigation.navigate('Chat', { conversationId: res.conversationId });
            else openDetails(req);
          } catch (e) {
            console.warn('acceptRequest error', e);
            Alert.alert('Erreur', e?.message || 'Impossible d\'accepter la demande.');
          } finally {
            setActionLoading(prev => ({ ...prev, [req.id]: false }));
          }
        }
      }
    ]);
  };

  const handleReject = async (req) => {
    if (!me) return Alert.alert('Erreur', 'Utilisateur non connecté.');
    Alert.alert('Confirmer', 'Refuser cette demande ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser', style: 'destructive', onPress: async () => {
          setActionLoading(prev => ({ ...prev, [req.id]: true }));
          try {
            await firestoreService.rejectRequestForRide(req.id, me);
          } catch (e) {
            console.warn('rejectRequest error', e);
            Alert.alert('Erreur', e?.message || 'Impossible de refuser la demande.');
          } finally {
            setActionLoading(prev => ({ ...prev, [req.id]: false }));
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const name = item.__requesterName || item.userId;
    const originLabel = item.origin?.label || item.pickup?.label || '';
    const destLabel = item.destination?.label || item.dest?.label || '';
    const when = item.date ? (item.date.toDate ? item.date.toDate().toLocaleString() : String(item.date)) : (item.createdAt ? (item.createdAt.toDate ? item.createdAt.toDate().toLocaleString() : String(item.createdAt)) : '');
    const canAct = me && item.userId && me !== item.userId;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.sub}>{originLabel} → {destLabel}</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.time}>{when}</Text>

          {canAct ? (
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity onPress={() => handleAccept(item)} style={[styles.actionBtn, { backgroundColor: '#2f9f7a', marginRight: 8, opacity: actionLoading[item.id] ? 0.6 : 1 }]} disabled={!!actionLoading[item.id]}>
                <Text style={styles.actionText}>{actionLoading[item.id] ? '...' : 'Accepter'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleReject(item)} style={[styles.actionBtn, { backgroundColor: '#ff6b6b', opacity: actionLoading[item.id] ? 0.6 : 1 }]} disabled={!!actionLoading[item.id]}>
                <Text style={styles.actionText}>{actionLoading[item.id] ? '...' : 'Refuser'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (<View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator/></View>);
  if (!requests.length) return (<View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text style={{ color:'#666' }}>Aucune demande ouverte.</Text></View>);

  return (
    <FlatList data={requests} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{ padding:12 }} ItemSeparatorComponent={() => <View style={{ height:10 }} />} />
  );
}

const styles = StyleSheet.create({
  card: { padding:12, backgroundColor:'#fff', borderRadius:10, flexDirection:'row', alignItems:'center', elevation:1 },
  title: { fontWeight:'700', fontSize:15 },
  sub: { color:'#666', marginTop:4, maxWidth:200 },
  time: { fontSize:11, color:'#999' },
  actionBtn: { paddingHorizontal:12, paddingVertical:8, borderRadius:8 },
  actionText: { color:'#fff', fontWeight:'700' },
});