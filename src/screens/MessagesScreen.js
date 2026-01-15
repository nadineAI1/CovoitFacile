import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import { listenConversation, sendMessage } from '../services/firestore';
import { auth } from '../firebase';



export default function MessagesScreen({ route, navigation }) {
  const convoId = route?.params?.conversationId;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(!!convoId);
  const me = auth.currentUser;

  useEffect(() => {
    let unsub = null;
    if (convoId) {
      unsub = listenConversation(convoId, (rows) => {
        setMessages(rows);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => unsub && unsub();
  }, [convoId]);

  const onSend = async () => {
    if (!text.trim() || !convoId || !me) return;
    await sendMessage(convoId, me.uid, null, text.trim()); // toUserId optional
    setText('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!convoId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.placeholderTitle}>Messages</Text>
        <Text style={styles.placeholderText}>Aucune conversation sélectionnée.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === me.uid ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={{ color: item.from === me.uid ? '#fff' : '#000' }}>{item.text}</Text>
            <Text style={styles.ts}>{new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt || Date.now()).toLocaleTimeString()}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} placeholder="Écrire un message..." style={styles.input} />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Text style={{ color: '#fff' }}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  placeholderTitle: { fontSize: 20, fontWeight: '700', color: Colors.primary, margin: 16 },
  placeholderText: { marginHorizontal: 16, color: Colors.muted },

  bubble: { padding: 10, borderRadius: 8, marginBottom: 8, maxWidth: '80%' },
  bubbleMe: { backgroundColor: Colors.primary, alignSelf: 'flex-end' },
  bubbleThem: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#eee' },
  ts: { fontSize: 10, color: '#666', marginTop: 6 },

  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  input: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#f7f7f7', marginRight: 8 },
  sendBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 8 },
});