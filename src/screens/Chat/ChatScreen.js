import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestoreService from '../../services/firestore'; // use default export
import { auth } from '../../firebase';

const userCache = new Map(); // session cache for user profiles

export default function ChatScreen({ route }) {
  const { conversationId } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [participantsProfiles, setParticipantsProfiles] = useState([]);
  const flatRef = useRef(null);
  const me = auth.currentUser?.uid;
  const insets = useSafeAreaInsets();

  const unsubMsgsRef = useRef(null);
  const unsubConvRef = useRef(null);
  const currentConvRef = useRef(null);

  // normalize incoming message object from Firestore row
  function normalizeMessage(r) {
    const from = r.from || r.senderId || r.userId || r.author || null;
    const createdAtRaw = r.createdAt || r.created_at || r.ts || null;
    const createdAt = createdAtRaw && typeof createdAtRaw.toDate === 'function'
      ? createdAtRaw.toDate()
      : (createdAtRaw instanceof Date ? createdAtRaw : null);
    return {
      id: r.id,
      from,
      text: r.text || r.body || '',
      createdAt,
      _raw: r,
    };
  }

  // ensure profiles for given UIDs are loaded into userCache
  async function ensureProfiles(uids = []) {
    const missing = Array.from(new Set(uids.filter(uid => uid && !userCache.has(uid))));
    if (!missing.length) return;
    await Promise.all(missing.map(async (uid) => {
      try {
        const p = await firestoreService.getUserProfile(uid);
        const display = p?.displayName || p?.name || p?.phone || uid;
        userCache.set(uid, { id: uid, displayName: display, raw: p });
      } catch (e) {
        // fallback to UID if profile lookup fails
        userCache.set(uid, { id: uid, displayName: uid, raw: null });
      }
    }));
  }

  // Subscribe to message list
  useEffect(() => {
    if (!conversationId) {
      if (typeof unsubMsgsRef.current === 'function') {
        unsubMsgsRef.current();
        unsubMsgsRef.current = null;
        currentConvRef.current = null;
      }
      return;
    }

    if (currentConvRef.current === conversationId && typeof unsubMsgsRef.current === 'function') {
      console.log('ChatScreen: already subscribed to conversation', conversationId);
      return;
    }

    if (typeof unsubMsgsRef.current === 'function') {
      unsubMsgsRef.current();
      unsubMsgsRef.current = null;
      currentConvRef.current = null;
    }

    currentConvRef.current = conversationId;
    console.log('ChatScreen: subscribing to messages for', conversationId);

    const unsub = firestoreService.listenConversationMessages(
      conversationId,
      async (rows) => {
        const mapped = (rows || []).map(normalizeMessage).sort((a, b) => {
          const ta = a.createdAt ? a.createdAt.getTime() : 0;
          const tb = b.createdAt ? b.createdAt.getTime() : 0;
          return ta - tb;
        });

        // filter out optimistic local placeholders (they start with local-)
        const filtered = mapped.filter(m => !String(m.id).startsWith('local-'));

        // ensure we have profiles for all senders and participants
        const senderIds = Array.from(new Set(filtered.map(m => m.from).filter(Boolean)));
        const participantIds = participantsProfiles.map(p => p.id).filter(Boolean);
        await ensureProfiles([...senderIds, ...participantIds]);

        // enrich messages with senderName
        const enriched = filtered.map(m => ({
          ...m,
          senderName: userCache.get(m.from)?.displayName || m.from,
        }));

        // newest first for inverted FlatList
        const newestFirst = enriched.slice().reverse();
        setMessages(newestFirst);
        console.log('ChatScreen: received messages count=', newestFirst.length);
      },
      (err) => {
        console.error('listenConversationMessages error', err);
      }
    );

    unsubMsgsRef.current = typeof unsub === 'function' ? unsub : null;

    // mark read (best effort)
    if (me) {
      firestoreService.markConversationRead(conversationId, me).catch(e => console.warn('markConversationRead failed', e));
    }

    return () => {
      if (typeof unsubMsgsRef.current === 'function') {
        unsubMsgsRef.current();
        unsubMsgsRef.current = null;
        currentConvRef.current = null;
      }
    };
  }, [conversationId, participantsProfiles, me]);

  // listen conversation doc to load participants and their profiles
  useEffect(() => {
    if (!conversationId) {
      if (typeof unsubConvRef.current === 'function') {
        unsubConvRef.current();
        unsubConvRef.current = null;
      }
      return;
    }

    if (typeof unsubConvRef.current === 'function') {
      unsubConvRef.current();
      unsubConvRef.current = null;
    }

    const unsubConv = firestoreService.listenConversation(
      conversationId,
      async (conv) => {
        try {
          const parts = (conv && Array.isArray(conv.participants)) ? conv.participants : [];
          // fetch profiles and update both cache and state
          await ensureProfiles(parts);
          const profiles = await Promise.all(parts.map(async (uid) => {
            // prefer cache
            const cached = userCache.get(uid);
            if (cached) return { id: uid, name: cached.raw?.displayName || cached.raw?.name || cached.displayName, phone: cached.raw?.phone || cached.raw?.phoneNumber || null };
            const p = await firestoreService.getUserProfile(uid).catch(() => null);
            return p ? { id: uid, name: p.displayName || p.name || null, phone: p.phone || p.phoneNumber || null } : { id: uid, name: null, phone: null };
          }));
          setParticipantsProfiles(profiles);
        } catch (e) {
          console.warn('fetch participants profiles failed', e);
          setParticipantsProfiles([]);
        }
      },
      (err) => console.error('listenConversation error', err)
    );

    unsubConvRef.current = typeof unsubConv === 'function' ? unsubConv : null;

    return () => {
      if (typeof unsubConvRef.current === 'function') {
        unsubConvRef.current();
        unsubConvRef.current = null;
      }
    };
  }, [conversationId]);

  const otherParticipant = participantsProfiles.find(p => p.id !== me) || null;
  const myProfile = participantsProfiles.find(p => p.id === me) || null;

  const dial = async (phone) => {
    if (!phone) return;
    const url = `tel:${phone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else alert('Impossible d\'ouvrir le composeur téléphonique sur cet appareil.');
    } catch (e) {
      console.warn('dial error', e);
    }
  };

  // send message
  const onSend = async () => {
    const trimmed = (text || '').trim();
    if (!trimmed || !conversationId || !me) return;

    const optimistic = {
      id: `local-${Date.now()}`,
      from: me,
      text: trimmed,
      createdAt: new Date(),
      optimistic: true,
      senderName: myProfile?.name || userCache.get(me)?.displayName || 'Vous',
    };
    setMessages(m => [optimistic, ...m]);
    setText('');

    try {
      if (typeof firestoreService.sendMessage === 'function') {
        // optionally pass senderName if you've modified sendMessage to accept it
        await firestoreService.sendMessage(conversationId, me, trimmed /*, myProfile?.name || null */);
      } else {
        console.warn('sendMessage not implemented in firestoreService');
      }
      // mark read for sender
      firestoreService.markConversationRead(conversationId, me).catch(() => {});
    } catch (e) {
      console.warn('sendMessage failed', e);
      // remove optimistic
      setMessages(m => m.filter(msg => msg.id !== optimistic.id));
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.from === me;
    const dateStr = item.createdAt ? item.createdAt.toLocaleTimeString() : '';
    const senderName = item.senderName || userCache.get(item.from)?.displayName || (isMe ? 'Vous' : item.from);
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        {!isMe && <Text style={{ fontWeight: '700', marginBottom: 4 }}>{senderName}</Text>}
        <Text style={styles.msgText}>{item.text}</Text>
        <Text style={styles.msgTime}>{dateStr}{item.optimistic ? ' • …' : ''}</Text>
      </View>
    );
  };

  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 44 : insets.top + 56;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={styles.contactBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactTitle}>{otherParticipant?.name || userCache.get(otherParticipant?.id)?.displayName || 'Contact'}</Text>
          <Text style={styles.contactRole}>{otherParticipant?.name ? '' : 'Conducteur / Passager'}</Text>
          <Text style={styles.contactPhone}>{otherParticipant?.phone || otherParticipant?.phoneNumber || '—'}</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <TouchableOpacity style={styles.callBtn} onPress={() => dial(otherParticipant?.phone || otherParticipant?.phoneNumber)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Appeler</Text>
          </TouchableOpacity>
          <Text style={styles.smallText}>{myProfile?.name || userCache.get(me)?.displayName || 'Vous'}</Text>
          <Text style={styles.smallText}>{myProfile?.phone || ''}</Text>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        inverted
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écrire un message..."
          style={styles.input}
          multiline
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
        <TouchableOpacity onPress={onSend} style={styles.sendBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  contactTitle: { fontWeight: '800', fontSize: 14 },
  contactRole: { color: '#333', marginTop: 2 },
  contactPhone: { color: '#0b6563', marginTop: 4, fontWeight: '700' },
  callBtn: { backgroundColor: '#0b6563', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  smallText: { fontSize: 11, color: '#666', marginTop: 6 },

  bubble: { padding: 10, borderRadius: 10, marginVertical: 6, maxWidth: '80%' },
  bubbleLeft: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  bubbleRight: { backgroundColor: '#bff06f', alignSelf: 'flex-end' },
  msgText: { fontSize: 15 },
  msgTime: { fontSize: 10, color: '#666', marginTop: 6 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#2f86ff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
});