import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestore';
import { Colors } from '../theme';

export default function LoginScreen({ navigation, route }) {

  const roleProp = route?.params?.role || route?.role || null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email || !password) return Alert.alert('Erreur', 'Email et mot de passe requis');
    try {
      setLoading(true);
      const res = await signInWithEmailAndPassword(auth, email, password);
      const u = res.user;
      const profile = await getUserProfile(u.uid);
      if (!profile) {
        await auth.signOut();
        return Alert.alert('Compte incomplet', 'Ton profil est introuvable.');
      }
      
      if (roleProp && profile.role !== roleProp) {
        await auth.signOut();
        return Alert.alert('Mauvais rôle', `Ce compte est enregistré comme "${profile.role}". Utilise la section correspondante.`);
      }
    
      const target = profile.role === 'driver' ? 'Driver' : 'Student';
      navigation.reset({ index:0, routes:[{ name: target }] });
    } catch (e) {
      Alert.alert('Erreur connexion', e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>Connexion</Text>
        <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={styles.input} value={email} onChangeText={setEmail} />
        <TextInput placeholder="Mot de passe" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
        <TouchableOpacity style={styles.btn} onPress={onLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
        </TouchableOpacity>

        <View style={{flexDirection:'row', justifyContent:'center', marginTop:12}}>
          <Text>Pas de compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register', { role: roleProp || 'student' })}>
            <Text style={{color: Colors.primary, fontWeight:'700'}}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex:1, backgroundColor: Colors.background },
  container: { padding:20, marginTop: Platform.OS==='ios' ? 40 : 20 },
  title: { fontSize:22, fontWeight:'800', color: Colors.primary, marginBottom:12 },
  input: { backgroundColor:'#fff', padding:12, borderRadius:8, borderWidth:1, borderColor:'#eee', marginBottom:10 },
  btn: { backgroundColor: Colors.primary, paddingVertical:14, borderRadius:10, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700' }
});