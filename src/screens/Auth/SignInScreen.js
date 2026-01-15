import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { normalizePhone, phoneToSyntheticEmail } from '../../utils/auth';

export default function SignInScreen({ navigation }) {
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const humanizeError = (code, message) => {
    if (!code) return message || 'Erreur';
    if (code.includes('user-not-found')) return "Utilisateur non trouvé.";
    if (code.includes('wrong-password')) return 'Numéro ou mot de passe incorrect.';
    if (code.includes('too-many-requests')) return 'Trop de tentatives, réessaie plus tard.';
    return message || code;
  };

  const onSignIn = async () => {
    if (!identifier) return Alert.alert('Erreur', 'Entrez ton téléphone ou email.');
    if (!password) return Alert.alert('Erreur', 'Mot de passe requis.');

    setLoading(true);
    try {
     
      const isEmail = identifier.includes('@');
      let emailForAuth = identifier;
      if (!isEmail) {
        const norm = normalizePhone(identifier);
        if (!norm) throw new Error('Numéro invalide');
        emailForAuth = phoneToSyntheticEmail(norm);
      }

      await signInWithEmailAndPassword(auth, emailForAuth, password);
    } catch (err) {
      console.warn('signin error', err);
      Alert.alert('Erreur connexion', humanizeError(err.code || '', err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontWeight: '700', fontSize: 22, marginBottom: 12 }}>Se connecter</Text>

      <Text>Téléphone ou email</Text>
      <TextInput
        style={styles.input}
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="0655123456 ou email"
        keyboardType="default"
        autoCapitalize="none"
      />

      <Text style={{ marginTop: 8 }}>Mot de passe</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
        onPress={onSignIn}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Se connecter</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ marginTop: 12 }}>
        <Text style={{ color: '#2f86ff' }}>Pas de compte ? S'inscrire</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 6,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#2f86ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});