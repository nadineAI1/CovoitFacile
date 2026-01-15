// src/screens/Driver/VerificationScreen.js
// Full screen for driver to submit ID and vehicle photos for verification
// Requires: expo-image-picker (or adapt to other picker)

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageAsync } from '../../services/storage';
import { createVerificationRequest } from '../../services/drivers';
import { auth } from '../../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerificationScreen({ navigation }) {
  const uid = auth.currentUser?.uid;
  const [idPhoto, setIdPhoto] = useState(null);
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (setter) => {
    try {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!res.granted) return Alert.alert('Permission refusée', 'Permission d\'accès aux photos requise.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.cancelled) return;
      setter(result.uri);
    } catch (e) {
      console.warn('pickImage error', e);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie.');
    }
  };

  const takePhoto = async (setter) => {
    try {
      const res = await ImagePicker.requestCameraPermissionsAsync();
      if (!res.granted) return Alert.alert('Permission refusée', 'Permission caméra requise.');
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (result.cancelled) return;
      setter(result.uri);
    } catch (e) {
      console.warn('takePhoto error', e);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra.');
    }
  };

  const submit = async () => {
    if (!uid) return Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
    if (!idPhoto || !vehiclePhoto) return Alert.alert('Photos requises', 'Ajoute la carte d\'identité et une photo du véhicule.');

    setUploading(true);
    try {
      const idPath = `driver-uploads/${uid}/verification/id-${Date.now()}.jpg`;
      const vehPath = `driver-uploads/${uid}/verification/veh-${Date.now()}.jpg`;

      const idUrl = await uploadImageAsync(idPhoto, idPath);
      const vehUrl = await uploadImageAsync(vehiclePhoto, vehPath);

      const vrId = await createVerificationRequest(uid, [idUrl, vehUrl], { source: 'app' });

      Alert.alert('Envoyé', 'Demande envoyée — en attente de validation.');
      navigation.goBack();
    } catch (e) {
      console.warn('verification submit error', e);
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande. Réessaie.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.title}>Vérification chauffeur</Text>

      <Text style={styles.label}>Photo de la carte d'identité</Text>
      {idPhoto ? <Image source={{ uri: idPhoto }} style={styles.preview} /> : <View style={styles.previewPlaceholder}><Text style={{ color: '#999' }}>Aucune photo</Text></View>}
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => pickImage(setIdPhoto)}><Text>Choisir</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { marginLeft: 8 }]} onPress={() => takePhoto(setIdPhoto)}><Text>Prendre</Text></TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>Photo du véhicule</Text>
      {vehiclePhoto ? <Image source={{ uri: vehiclePhoto }} style={styles.preview} /> : <View style={styles.previewPlaceholder}><Text style={{ color: '#999' }}>Aucune photo</Text></View>}
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => pickImage(setVehiclePhoto)}><Text>Choisir</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { marginLeft: 8 }]} onPress={() => takePhoto(setVehiclePhoto)}><Text>Prendre</Text></TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.submit, uploading && { opacity: 0.7 }]} onPress={submit} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Soumettre la vérification</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  label: { fontWeight: '700', marginTop: 8 },
  preview: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
  previewPlaceholder: { width: '100%', height: 160, borderRadius: 8, marginTop: 8, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', marginTop: 8 },
  btn: { padding: 10, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center' },
  submit: { marginTop: 20, backgroundColor: '#2f9f7a', padding: 14, borderRadius: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' },
});