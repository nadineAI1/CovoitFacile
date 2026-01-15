import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';
import { createUserProfile } from '../../services/firestore';
import { normalizePhone, phoneToSyntheticEmail } from '../../utils/auth';

export default function SignUpScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailReal, setEmailReal] = useState(''); 
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); 
  const [loading, setLoading] = useState(false);

  const humanizeError = (code, message) => {
    if (!code) return message || 'Erreur';
    if (code.includes('email-already-in-use')) return 'Ce numéro est déjà utilisé.';
    if (code.includes('invalid-email')) return 'Identifiant invalide.';
    if (code.includes('weak-password')) return 'Mot de passe trop faible (min 6 caractères).';
    return message || code;
  };

  const onSignUp = async () => {
    const normPhone = normalizePhone(phone);
    if (!normPhone) return Alert.alert('Erreur', 'Entrez un numéro de téléphone valide.');
    if (!password || password.length < 6) return Alert.alert('Erreur', 'Mot de passe minimum 6 caractères.');

    setLoading(true);
    try {
 
      const syntheticEmail = phoneToSyntheticEmail(normPhone);


      const cred = await createUserWithEmailAndPassword(auth, syntheticEmail, password);

      if (displayName) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch (e) {
          console.warn('updateProfile failed', e);
        }
      }

      const payload = {
        displayName: displayName || null,
        phone: normPhone,
        email: emailReal || null,
        role,
        createdAt: new Date(),
      };
      await createUserProfile(cred.user.uid, payload);

      
      Alert.alert(
        'Compte créé',
        `Ton compte a été créé avec succès. Tu es connecté en tant que ${role}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.warn('signup error', err);
      Alert.alert('Erreur inscription', humanizeError(err.code || '', err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontWeight: '700', fontSize: 22, marginBottom: 12 }}>Créer un compte</Text>

      <Text style={{ marginTop: 8 }}>Nom complet (optionnel)</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Ton nom complet"
        autoCapitalize="words"
      />

      <Text style={{ marginTop: 8 }}>Téléphone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Ex: 0655123456"
        keyboardType="phone-pad"
      />

      <Text style={{ marginTop: 8 }}>Email (optionnel)</Text>
      <TextInput
        style={styles.input}
        value={emailReal}
        onChangeText={setEmailReal}
        placeholder="ton@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={{ marginTop: 8 }}>Mot de passe</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe (min 6 caractères)"
        secureTextEntry
      />

      <Text style={{ marginTop: 8 }}>Tu es</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
          onPress={() => setRole('student')}
        >
          <Text>Étudiant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'driver' && styles.roleBtnActive]}
          onPress={() => setRole('driver')}
        >
          <Text>Conducteur</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
        onPress={onSignUp}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>S'inscrire</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 12 }}>
        <Text style={{ color: '#2f86ff' }}>J'ai déjà un compte — Se connecter</Text>
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
  roleBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  roleBtnActive: {
    backgroundColor: '#e6f5ff',
    borderColor: '#2f86ff',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#2f86ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});