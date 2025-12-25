import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Layout } from '../theme';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister() {
    try {
      const uc = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // create user document
      await setDoc(doc(db, 'users', uc.user.uid), {
        email: email.trim(),
        createdAt: serverTimestamp(),
        displayName: '',
        role: 'student',
      });
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Créer un compte</Text>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        <TextInput placeholder="Mot de passe" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
        <TouchableOpacity style={styles.primary} onPress={handleRegister}>
          <Text style={styles.primaryText}>S'inscrire</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: Colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.soft, justifyContent: 'center' },
  inner: { margin: Layout.padding, backgroundColor: Colors.white, borderRadius: Layout.cardRadius, padding: Layout.padding + 6 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  input: { backgroundColor: '#f6f8f6', padding: 12, borderRadius: 12, marginBottom: 10 },
  primary: { backgroundColor: Colors.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  primaryText: { color: Colors.white, fontWeight: '700' },
});