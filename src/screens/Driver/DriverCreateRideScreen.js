import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator, TextInput, ScrollView, Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { auth, db } from '../../firebase';
import { addDoc, collection, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { createVerificationRequestWithThumbs } from '../../services/drivers';
import { signOut } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateSelector from '../../components/DateSelector';

const resizeWidth = 600;
const compressQuality = 0.6;
const perImageMaxBytes = 300000;

export default function DriverCreateRideScreen({ navigation }) {
  const [route, setRoute] = useState([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [seats, setSeats] = useState('3');
  const [price, setPrice] = useState('');
  const [driverPhotoUri, setDriverPhotoUri] = useState(null);
  const [driverPhotoBase64, setDriverPhotoBase64] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rideDate, setRideDate] = useState(null);
  const mapRef = useRef(null);

  const onMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setRoute((r) => [...r, { lat: latitude, lng: longitude }]);
  };

  async function processImageToBase64(uri) {
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: resizeWidth } }],
      { compress: compressQuality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!manip || !manip.base64) throw new Error('Image processing failed');
    const b64 = manip.base64;
    const bytes = Math.ceil((b64.length * 3) / 4);
    return { base64: b64, sizeBytes: bytes, uri: manip.uri || uri };
  }

  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission refusée', "Accès aux photos requis.");
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return Alert.alert('Erreur', 'URI image introuvable.');
      const processed = await processImageToBase64(uri);
      if (processed.sizeBytes > perImageMaxBytes) return Alert.alert('Image trop volumineuse');
      setDriverPhotoUri(processed.uri);
      setDriverPhotoBase64(processed.base64);
    } catch (e) {
      console.warn(e);
      Alert.alert('Erreur', 'Impossible d\'importer l\'image.');
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission refusée', 'Permission caméra requise.');
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      const processed = await processImageToBase64(uri);
      if (processed.sizeBytes > perImageMaxBytes) return Alert.alert('Image trop volumineuse');
      setDriverPhotoUri(processed.uri);
      setDriverPhotoBase64(processed.base64);
    } catch (e) {
      console.warn(e);
      Alert.alert('Erreur', 'Impossible de prendre la photo.');
    }
  };

  const validateBeforeCreate = () => {
    if (!auth.currentUser) {
      Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
      return false;
    }
    if (!route || route.length < 2) {
      Alert.alert('Trajet incomplet', 'Trace au moins deux points.');
      return false;
    }
    if (!licenseNumber.trim()) {
      Alert.alert('Matricule requis', 'Saisis le numéro de matricule.');
      return false;
    }
    const seatsNum = Number(seats);
    if (isNaN(seatsNum) || seatsNum <= 0) {
      Alert.alert('Places invalides');
      return false;
    }
    if (!rideDate) {
      Alert.alert('Date requise', 'Veuillez sélectionner la date du trajet.');
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validateBeforeCreate()) return;
    setSaving(true);
    const uid = auth.currentUser.uid;

    try {
      const d = rideDate instanceof Date ? rideDate : new Date(rideDate);
      if (isNaN(d.getTime())) {
        Alert.alert('Date invalide');
        setSaving(false);
        return;
      }

      const userSnap = await getDoc(doc(db, 'users', uid));
      const verified = userSnap.exists() && userSnap.data().verified === true;

      if (!verified) {
        try {
          const thumbs = driverPhotoBase64 ? [driverPhotoBase64] : [];
          await createVerificationRequestWithThumbs(uid, { licenseNumber: licenseNumber.trim() }, thumbs, { source: 'from-create-ride' });
        } catch (err) {
          console.warn(err);
        }
      }

      const startLocation = { lat: route[0].lat, lng: route[0].lng };
      const endLocation = { lat: route[route.length - 1].lat, lng: route[route.length - 1].lng };

      if (startLocation.lat === endLocation.lat && startLocation.lng === endLocation.lng) {
        Alert.alert('Trajet invalide', 'Départ et arrivée identiques.');
        setSaving(false);
        return;
      }

      const ridePayload = {
        driverId: uid,
        route,
        startLocation,
        endLocation,
        seats: Number(seats),
        price: price ? Number(price) : null,
        licenseNumber: licenseNumber.trim(),
        hasDriverPhotoThumb: !!driverPhotoBase64,
        createdAt: serverTimestamp(),
        isActive: true,
        date: Timestamp.fromDate(d),
      };

      await addDoc(collection(db, 'rides'), ridePayload);

      Alert.alert('Trajet enregistré', 'Ton trajet a été créé.');
      navigation.goBack();
    } catch (e) {
      console.warn(e);
      Alert.alert('Erreur', "Impossible d'enregistrer le trajet.");
    } finally {
      setSaving(false);
    }
  };

  const onClear = () => {
    setRoute([]);
    setLicenseNumber('');
    setDriverPhotoUri(null);
    setDriverPhotoBase64(null);
    setSeats('3');
    setPrice('');
    setRideDate(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace('Welcome');
    } catch (e) {
      console.warn(e);
      Alert.alert('Erreur', 'Impossible de se déconnecter.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8 }}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleSignOut}>
          <Text style={{ color: '#c0392b', fontWeight: '700' }}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{ latitude: 36.9, longitude: 7.76, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
          onPress={onMapPress}
          showsUserLocation
        >
          {route.map((pt, i) => (
            <Marker key={i} coordinate={{ latitude: pt.lat, longitude: pt.lng }} />
          ))}
          {route.length >= 2 && (
            <Polyline coordinates={route.map(p => ({ latitude: p.lat, longitude: p.lng }))} strokeWidth={4} strokeColor="#2f9f7a" />
          )}
        </MapView>

        <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 8 }}>
          <Text style={styles.title}>Créer un trajet</Text>

          <Text style={styles.label}>Date et heure du trajet</Text>
          <DateSelector date={rideDate} onChange={setRideDate} />

          <Text style={styles.label}>Matricule (numéro permis)</Text>
          <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="AB1234567" />

          <Text style={styles.label}>Places disponibles</Text>
          <TextInput style={styles.input} value={seats} onChangeText={setSeats} keyboardType="numeric" />

          <Text style={styles.label}>Prix (optionnel)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

          <Text style={styles.label}>Photo conducteur</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <TouchableOpacity style={styles.smallBtn} onPress={takePhoto}><Text>Prendre</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, { marginLeft: 8 }]} onPress={pickFromGallery}><Text>Galerie</Text></TouchableOpacity>
          </View>
          {driverPhotoUri && <Image source={{ uri: driverPhotoUri }} style={{ width: 100, height: 100, borderRadius: 8 }} />}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enregistrer</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnAlt} onPress={onClear}><Text>Effacer</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eef6f8', borderRadius: 8 },
  sheet: { position: 'absolute', left: 10, right: 10, bottom: 10, maxHeight: 420, backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 6 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  label: { fontWeight: '700', marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 6 },
  smallBtn: { padding: 10, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center' },
  btn: { backgroundColor: '#2f9f7a', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnAlt: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee', width: 90 },
});
