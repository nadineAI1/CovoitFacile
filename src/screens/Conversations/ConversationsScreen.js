import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import firestoreService from '../../services/firestore';
import { auth } from '../../firebase';

/**
 * ConversationsScreen (sans bouton Supprimer)
 * - affiche les noms (participantsMeta ou getUserProfile)
 * - met en cache les profils en mémoire
 * - n'inclut plus la possibilité de supprimer depuis l'UI
 */

const profileCache = new Map();

async function ensureProfiles(uids = []) {
  const toFetch = [];
  for (const uid of uids) {
    if (!uid) continue;
    if (!profileCache.has(uid)) toFetch.push(uid);
  }
  if (!toFetch.length) return;
  await Promise.all(toFetch.map(async (uid) => {
    try {
      const p = await firestoreService.getUserProfile(uid);
      const prof = p ? {
        id: uid,
        name: p.name || p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || null,
        phone: p.phone || p.phoneNumber || null,
      } : { id: uid, name: null, phone: null };
      profileCache.set(uid, prof);
    } catch (e) {
      profileCache.set(uid, { id: uid, name: null, phone: null });
    }
  }));
}

export default function ConversationsScreen({ navigation }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const me = auth.currentUser?.uid;

  useEffect(() => {
    console.log('ConversationsScreen mounted');
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!me) return;
    setLoading(true);
    const unsub = firestoreService.listenUserConversations(me, async (rows) => {
      if (!mounted.current) return;
      const normalized = (rows || []).map(r => ({ ...r }));
      setConvs(normalized);

      // collect other participant ids that we need names for
      const otherIds = new Set();
      for (const c of normalized) {
        if (Array.isArray(c.participantsMeta) && c.participantsMeta.length) {
          // cache participantsMeta entries too
          for (const pm of c.participantsMeta) {
            if (pm && pm.id && !profileCache.has(pm.id)) {
              profileCache.set(pm.id, { id: pm.id, name: pm.name || null, phone: pm.phone || null });
            }
          }
          // still add unknown participant ids to ensure cache
          const other = (Array.isArray(c.participants) ? c.participants.find(p => p !== me) : null);
          if (other && !profileCache.has(other)) otherIds.add(other);
        } else {
          const other = (Array.isArray(c.participants) ? c.participants.find(p => p !== me) : null);
          if (other) otherIds.add(other);
        }
      }

      // fetch missing profiles
      await ensureProfiles(Array.from(otherIds));
      if (!mounted.current) return;
      setLoading(false);
    }, (err) => {
      console.warn('listenUserConversations error', err);
      if (mounted.current) setLoading(false);
    }, 200);

    return () => { if (typeof unsub === 'function') unsub(); };
  }, [me]);

  // helper to get displayName for a conv
  function getDisplayName(conv) {
    if (!conv) return '';
    // prefer participantsMeta
    if (Array.isArray(conv.participantsMeta) && conv.participantsMeta.length) {
      const other = conv.participantsMeta.find(p => p.id !== me);
      if (other && (other.name || other.phone)) return other.name || other.phone || other.id;
    }
    // else check cache
    const otherId = Array.isArray(conv.participants) ? conv.participants.find(p => p !== me) : null;
    if (otherId) {
      const prof = profileCache.get(otherId);
      if (prof && (prof.name || prof.phone)) return prof.name || prof.phone;
      return otherId; // fallback uid
    }
    return conv.id;
  }

  const openChat = (conv) => navigation.navigate('Chat', { conversationId: conv.id });

  const renderItem = ({ item }) => {
    const name = getDisplayName(item);
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

  if (loading) return (<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>);
  if (!convs.length) return (<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#666'}}>Aucune conversation.</Text></View>);

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