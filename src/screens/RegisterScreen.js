import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { createUserProfile } from '../services/firestore';
import { Colors } from '../theme';

export default function RegisterScreen({ navigation, route }) {

  const defaultRole = route?.params?.role || (route?.role) || 'student';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!email || !password || !displayName) {
      return Alert.alert('Erreur', 'Nom, email et mot de passe sont requis');
    }
    try {
      setLoading(true);
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const user = res.user;

      await updateProfile(user, { displayName });


      await createUserProfile(user.uid, {
        displayName,
        email,
        phone,
        role,
      });

      const target = role === 'driver' ? 'Driver' : 'Student';
      navigation.reset({ index: 0, routes: [{ name: target }] });
    } catch (e) {
      Alert.alert('Erreur inscription', e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>{role === 'driver' ? 'Inscription Conducteur' : "Inscription Étudiant"}</Text>

        <TextInput placeholder="Nom complet" value={displayName} onChangeText={setDisplayName} style={styles.input} />
        <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput placeholder="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
        <TextInput placeholder="Téléphone (+229...)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={styles.input} />

        {/* Optionnel : permettre de basculer rôle à l'inscription */}
        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:12}}>
          <TouchableOpacity onPress={()=>setRole('student')} style={[styles.roleBtn, role==='student' && styles.roleActive]}>
            <Text style={role==='student' ? styles.roleTextActive : styles.roleText}>Étudiant</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>setRole('driver')} style={[styles.roleBtn, role==='driver' && styles.roleActive]}>
            <Text style={role==='driver' ? styles.roleTextActive : styles.roleText}>Conducteur</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={onRegister} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Inscription...' : "S'inscrire"}</Text>
        </TouchableOpacity>

        <View style={{flexDirection:'row', justifyContent:'center', marginTop:12}}>
          <Text>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}><Text style={{color: Colors.primary, fontWeight:'700'}}>Connexion</Text></TouchableOpacity>
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
  roleBtn: { flex:1, padding:10, borderRadius:8, borderWidth:1, borderColor:'#ddd', marginRight:8, alignItems:'center' },
  roleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { color: Colors.primary },
  roleTextActive: { color:'#fff', fontWeight:'700' },
  btn: { backgroundColor: Colors.primary, paddingVertical:14, borderRadius:10, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700' }
});