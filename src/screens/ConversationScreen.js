import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import firestoreService from '../../services/firestore';
import { auth } from '../../firebase';

// Simple in-memory cache pour les profils pendant la session
const profileCache = new Map();

async function loadProfile(uid) {
  if (!uid) return null;
  if (profileCache.has(uid)) return profileCache.get(uid);
  try {
    const p = await firestoreService.getUserProfile(uid);
    const profile = p ? {
      id: uid,
      name: p.name || p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || null,
      phone: p.phone || p.phoneNumber || null,
    } : { id: uid, name: null, phone: null };
    profileCache.set(uid, profile);
    return profile;
  } catch (e) {
    profileCache.set(uid, { id: uid, name: null, phone: null });
    return { id: uid, name: null, phone: null };
  }
}

export default function ConversationsScreen({ navigation }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = firestoreService.listenUserConversations(uid, (rows) => {
      // copy rows so we can add __displayName later
      const normalized = (rows || []).map(r => ({ ...r }));
      setConvs(normalized);
      setLoading(false);
    }, (err) => {
      console.warn('listenUserConversations error', err);
      setLoading(false);
    }, 200);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [uid]);

  // résout les noms en background, met à jour localement
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const toResolve = [];
      for (const conv of convs) {
        // Prefer participantsMeta if it has name; otherwise schedule to fetch
        let display = null;
        if (Array.isArray(conv.participantsMeta) && conv.participantsMeta.length) {
          const other = conv.participantsMeta.find(p => p.id !== uid);
          if (other) display = other.name || other.phone || other.id;
        }
        if (!display) {
          const otherId = Array.isArray(conv.participants) ? conv.participants.find(p => p !== uid) : null;
          if (otherId) toResolve.push({ convId: conv.id, otherId });
        } else {
          // attach immediate
          conv.__displayName = display;
        }
      }
      if (!toResolve.length) {
        // update state if names derived
        if (!cancelled) setConvs(prev => prev.map(c => c.__displayName ? c : ({ ...c })));
        return;
      }
      await Promise.all(toResolve.map(async (job) => {
        try {
          const prof = await loadProfile(job.otherId);
          if (cancelled) return;
          setConvs(prev => prev.map(c => c.id === job.convId ? { ...c, __displayName: (prof && (prof.name || prof.phone)) || job.otherId } : c));
        } catch (e) {
          // ignore
        }
      }));
    })();
    return () => { cancelled = true; };
  }, [convs.length, uid]);

  const openChat = (conv) => navigation.navigate('Chat', { conversationId: conv.id });

  const renderItem = ({ item }) => {
    const name = item.__displayName || item.id;
    const last = item.lastMessage || '';
    const updatedAt = item.updatedAt ? (item.updatedAt.toDate ? item.updatedAt.toDate() : new Date(item.updatedAt)) : null;
    const timeLabel = updatedAt ? updatedAt.toLocaleString() : '';
    return (
      <TouchableOpacity onPress={() => openChat(item)} style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.last} numberOfLines={1}>{last}</Text>
        </View>
        <View style={{ alignItems:'flex-end' }}>
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>
  );

  if (!convs.length) {
    return (
      <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#666'}}>Aucune conversation pour le moment.</Text></View>
    );
  }

  return (
    <FlatList
      data={convs}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding:12 }}
      ItemSeparatorComponent={() => <View style={{ height:10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding:12, backgroundColor:'#fff', borderRadius:10, flexDirection:'row', alignItems:'center', elevation:1 },
  title: { fontWeight:'700', fontSize:16 },
  last: { color:'#666', marginTop:4, maxWidth:200 },
  time: { fontSize:11, color:'#999' },
});