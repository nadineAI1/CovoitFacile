import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../firebase';
import { createOrUpdateDriverProfile, listenDriverProfile, toggleAvailability } from '../../services/drivers';
import { Colors } from '../../theme';

export default function DriverProfileScreen({ navigation }) {
  const uid = auth.currentUser?.uid;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    vehicleModel: '',
    vehiclePlate: '',
    bio: '',
    available: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const unsub = listenDriverProfile(uid, (p) => {
      if (p) {
        setProfile({
          name: p.name || '',
          phone: p.phone || '',
          vehicleModel: p.vehicleModel || '',
          vehiclePlate: p.vehiclePlate || '',
          bio: p.bio || '',
          available: typeof p.available === 'boolean' ? p.available : true,
        });
      }
      setLoading(false);
    });
    return () => unsub && unsub();
  }, [uid]);

  const onSave = async () => {
    if (!uid) return Alert.alert('Non authentifié');
    setSaving(true);
    try {
      await createOrUpdateDriverProfile(uid, {
        name: profile.name || null,
        phone: profile.phone || null,
        vehicleModel: profile.vehicleModel || null,
        vehiclePlate: profile.vehiclePlate || null,
        bio: profile.bio || null,
        available: profile.available === true,
      });
      Alert.alert('Profil enregistré');
    } catch (e) {
      console.warn('save profile error', e);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  };

  const onToggleAvailable = async (val) => {
    setProfile((s) => ({ ...s, available: val }));
    try {
      await toggleAvailability(uid, val);
    } catch (e) {
      console.warn('toggleAvailability error', e);
    }
  };

  if (loading) return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mon profil conducteur</Text>

        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} value={profile.name} onChangeText={(t) => setProfile((s) => ({ ...s, name: t }))} placeholder="Ton nom" />

        <Text style={styles.label}>Téléphone</Text>
        <TextInput style={styles.input} value={profile.phone} onChangeText={(t) => setProfile((s) => ({ ...s, phone: t }))} placeholder="Numéro" keyboardType="phone-pad" />

        <Text style={styles.label}>Véhicule (modèle)</Text>
        <TextInput style={styles.input} value={profile.vehicleModel} onChangeText={(t) => setProfile((s) => ({ ...s, vehicleModel: t }))} placeholder="Ex: Renault Clio" />

        <Text style={styles.label}>Plaque</Text>
        <TextInput style={styles.input} value={profile.vehiclePlate} onChangeText={(t) => setProfile((s) => ({ ...s, vehiclePlate: t }))} placeholder="AA-111-BB" />

        <Text style={styles.label}>À propos (bio)</Text>
        <TextInput style={[styles.input, { height: 100 }]} value={profile.bio} onChangeText={(t) => setProfile((s) => ({ ...s, bio: t }))} placeholder="Quelques mots..." multiline />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <Text style={{ fontWeight: '700', marginRight: 12 }}>Disponible</Text>
          <Switch value={profile.available} onValueChange={onToggleAvailable} />
        </View>

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.8 }]} onPress={onSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Enregistrement...' : 'Enregistrer le profil'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnAlt]} onPress={() => navigation.navigate('DriverRides')}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>Voir mes trajets</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12, color: Colors.primary },
  label: { marginTop: 8, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  btn: { marginTop: 18, backgroundColor: Colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  btnAlt: { marginTop: 10, padding: 12, alignItems: 'center' },
});