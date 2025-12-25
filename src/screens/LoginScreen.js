import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Layout } from '../theme';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister() {
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Utilisateur créé', uc.user.uid);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleLogin() {
    try {
      const uc = await signInWithEmailAndPassword(auth, email, password);
      console.log('Connected', uc.user.uid);
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Welcome back</Text>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
          <Text style={styles.primaryText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <Text>Don't have an account?</Text>
          <TouchableOpacity onPress={handleRegister}>
            <Text style={{ color: Colors.primary, marginLeft: 8 }}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.soft, justifyContent: 'center' },
  inner: { margin: Layout.padding, backgroundColor: Colors.white, borderRadius: Layout.cardRadius, padding: Layout.padding + 6 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: '#f6f8f6', padding: 12, borderRadius: 12, marginBottom: 10 },
  primaryBtn: { backgroundColor: Colors.primary, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  primaryText: { color: Colors.white, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
});