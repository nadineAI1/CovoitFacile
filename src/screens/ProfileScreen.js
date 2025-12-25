import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function ProfileScreen({ navigation }) {
  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>Étudiant(e) - Profil</Text>
        <Text style={styles.email}>{auth.currentUser?.email}</Text>

        <TouchableOpacity style={styles.btn} onPress={handleSignOut}>
          <Text style={styles.btnText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.soft, justifyContent: 'center' },
  card: { margin: 16, backgroundColor: Colors.white, borderRadius: 18, padding: 18, alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700' },
  email: { color: Colors.muted, marginTop: 6 },
  btn: { marginTop: 16, backgroundColor: Colors.primary, padding: 12, borderRadius: 12, width: '80%', alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: '700' },
});