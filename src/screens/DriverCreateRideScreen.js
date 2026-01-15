import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { auth, db } from '../../firebase';
import { addDoc, collection, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { createVerificationRequestWithThumbs } from '../../services/drivers';
import { signOut } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const resizeWidth = 600;
const compressQuality = 0.6;
const perImageMaxBytes = 300000; // 300 KB per image
const totalMaxBytes = 600000; // 600 KB total

export default function DriverCreateRideScreen({ navigation }) {
  const [route, setRoute] = useState([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [seats, setSeats] = useState('3');
  const [price, setPrice] = useState('');
  const [driverPhotoUri, setDriverPhotoUri] = useState(null);
  const [driverPhotoBase64, setDriverPhotoBase64] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rideDate, setRideDate] = useState(new Date()); // default now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const mapRef = useRef(null);

  const onMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setRoute((r) => [...r, { lat: latitude, lng: longitude }]);
  };

  async function processImageToBase64(uri) {
    if (!uri || typeof uri !== 'string') throw new Error('Invalid image uri');
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      // result format: { canceled?: boolean, assets?: [{ uri, ... }] } or legacy { cancelled, uri }
      if (result.canceled || result.cancelled) return;
      const uri = result.assets?.[0]?.uri ?? result.uri;
      if (!uri) return Alert.alert('Erreur', 'URI image introuvable.');

      const processed = await processImageToBase64(uri);
      if (processed.sizeBytes > perImageMaxBytes) {
        return Alert.alert('Image trop volumineuse', `Image compressée ≈ ${Math.round(processed.sizeBytes / 1024)} KB. Réduis la taille.`);
      }
      const totalBytes = estimateTotalBytes(processed.base64, null);
      if (totalBytes > totalMaxBytes) {
        return Alert.alert('Taille totale trop grande', `Total ≈ ${Math.round(totalBytes / 1024)} KB > limite ${Math.round(totalMaxBytes / 1024)} KB.`);
      }
      setDriverPhotoUri(processed.uri);
      setDriverPhotoBase64(processed.base64);
    } catch (e) {
      console.warn('pickFromGallery/processImage error', e);
      Alert.alert('Erreur', 'Impossible d\'importer l\'image.');
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission refusée', 'Permission caméra requise.');
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (result.canceled || result.cancelled) return;
      const uri = result.assets?.[0]?.uri ?? result.uri;
      if (!uri) return Alert.alert('Erreur', 'URI image introuvable.');
      const processed = await processImageToBase64(uri);
      if (processed.sizeBytes > perImageMaxBytes) {
        return Alert.alert('Image trop volumineuse', `Image compressée ≈ ${Math.round(processed.sizeBytes / 1024)} KB.`);
      }
      const totalBytes = estimateTotalBytes(processed.base64, null);
      if (totalBytes > totalMaxBytes) {
        return Alert.alert('Taille totale trop grande', `Total ≈ ${Math.round(totalBytes / 1024)} KB > limite.`);
      }
      setDriverPhotoUri(processed.uri);
      setDriverPhotoBase64(processed.base64);
    } catch (e) {
      console.warn('takePhoto/processImage error', e);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra.');
    }
  };

  const estimateTotalBytes = (aB64, bB64) => {
    const a = aB64 ? Math.ceil((aB64.length * 3) / 4) : 0;
    const b = bB64 ? Math.ceil((bB64.length * 3) / 4) : 0;
    return a + b;
  };

  const validateBeforeCreate = () => {
    if (!auth.currentUser) {
      Alert.alert('Non authentifié', 'Connecte-toi d\'abord.');
      return false;
    }
    if (!route || route.length < 2) {
      Alert.alert('Trajet incomplet', 'Trace au moins deux points sur la carte (départ + arrivée).');
      return false;
    }
    if (!licenseNumber.trim()) {
      Alert.alert('Matricule requis', 'Saisis le numéro de matricule.');
      return false;
    }
    const seatsNum = Number(seats);
    if (!seats || isNaN(seatsNum) || seatsNum <= 0) {
      Alert.alert('Places invalides', 'Saisis un nombre de places valide.');
      return false;
    }
    if (!rideDate || !(rideDate instanceof Date) || isNaN(rideDate.getTime())) {
      Alert.alert('Date invalide', 'Sélectionne une date/heure valide pour le trajet.');
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!validateBeforeCreate()) return;
    setSaving(true);
    const uid = auth.currentUser.uid;
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const verified = userSnap.exists() && userSnap.data().verified === true;

      if (!verified) {
        try {
          const thumbs = driverPhotoBase64 ? [driverPhotoBase64] : [];
          await createVerificationRequestWithThumbs(uid, { licenseNumber: licenseNumber.trim(), vehiclePlate: null, vehicleModel: null }, thumbs, { source: 'from-create-ride' });
        } catch (err) {
          console.warn('create verification request error', err);
          // continue — we still create the ride (or you may choose to block)
        }
      }

      const startLocation = route && route.length ? { lat: route[0].lat, lng: route[0].lng } : null;
      const endLocation = route && route.length ? { lat: route[route.length - 1].lat, lng: route[route.length - 1].lng } : null;

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
      };

      if (rideDate) {
        const d = rideDate instanceof Date ? rideDate : new Date(rideDate);
        if (!isNaN(d.getTime())) ridePayload.date = Timestamp.fromDate(d);
      }

      await addDoc(collection(db, 'rides'), ridePayload);

      Alert.alert('Trajet enregistré', 'Ton trajet a été créé. S’il faut une validation, attends l’approbation admin.');
      navigation.goBack();
    } catch (e) {
      console.warn('create ride error', e);
      if (e?.code === 'permission-denied' || (e?.message && e.message.toLowerCase().includes('permission'))) {
        Alert.alert(
          'Pas autorisé',
          "Ton compte n'est pas (encore) vérifié et les règles empêchent la création automatique. Nous avons envoyé une demande de vérification ; attends la validation, ou contacte l'administrateur."
        );
      } else {
        Alert.alert('Erreur', "Impossible d'enregistrer le trajet. Réessaie plus tard.");
      }
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
    setRideDate(new Date());
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // After sign out, rely on onAuthStateChanged in App to redirect.
      // If you want to force navigation, navigate to Welcome root:
      navigation.replace('Welcome');
    } catch (e) {
      console.warn('signOut error', e);
      Alert.alert('Erreur', 'Impossible de se déconnecter.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8 }}>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('IncomingRequests')}>
            <Text style={{ color: '#0b6563', fontWeight: '700' }}>Demandes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, { marginLeft: 8 }]} onPress={() => navigation.navigate('Chat')}>
            <Text style={{ color: '#0b6563', fontWeight: '700' }}>Chat</Text>
          </TouchableOpacity>
        </View>
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
          {route.map((pt, i) => <Marker key={i} coordinate={{ latitude: pt.lat, longitude: pt.lng }} />)}
          {route.length >= 2 && <Polyline coordinates={route.map(p => ({ latitude: p.lat, longitude: p.lng }))} strokeWidth={4} strokeColor="#2f9f7a" />}
        </MapView>

        <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 8 }}>
          <Text style={styles.title}>Créer un trajet</Text>

          <Text style={styles.label}>Date et heure du trajet</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={[styles.input, { flex: 1, justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
              <Text>{rideDate ? rideDate.toLocaleDateString() : 'Sélectionner la date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.input, { width: 120, marginLeft: 8, justifyContent: 'center' }]} onPress={() => setShowTimePicker(true)}>
              <Text>{rideDate ? rideDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Heure'}</Text>
            </TouchableOpacity>
          </View>

          <DateTimePickerModal isVisible={showDatePicker} mode="date" onConfirm={(d) => { setShowDatePicker(false); onConfirmDate(d); }} onCancel={() => setShowDatePicker(false)} />
          <DateTimePickerModal isVisible={showTimePicker} mode="time" onConfirm={(t) => { setShowTimePicker(false); onConfirmTime(t); }} onCancel={() => setShowTimePicker(false)} />

          <Text style={styles.label}>Matricule (numéro permis)</Text>
          <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="Ex: AB1234567" autoCapitalize="characters" />

          <Text style={styles.label}>Places disponibles</Text>
          <TextInput style={styles.input} value={seats} onChangeText={setSeats} keyboardType="numeric" placeholder="3" />

          <Text style={styles.label}>Prix (optionnel)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" />

          <Text style={styles.label}>Photo du conducteur (selfie) — recommandée</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'center' }}>
            <TouchableOpacity style={styles.smallBtn} onPress={takePhoto}><Text>Prendre</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, { marginLeft: 8 }]} onPress={pickFromGallery}><Text>Galerie</Text></TouchableOpacity>
            <View style={{ marginLeft: 12, justifyContent: 'center' }}>
              <Text style={{ color: '#666' }}>{driverPhotoBase64 ? `Taille ≈ ${Math.round(Math.ceil((driverPhotoBase64.length * 3) / 4) / 1024)} KB` : 'Aucune'}</Text>
            </View>
          </View>
          {driverPhotoUri ? <Image source={{ uri: driverPhotoUri }} style={{ width: 100, height: 100, borderRadius: 8, marginBottom: 8 }} /> : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enregistrer le trajet</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnAlt, { width: 100 }]} onPress={onClear}>
              <Text>Effacer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eef6f8', borderRadius: 8 },
  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    maxHeight: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 6,
  },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  label: { fontWeight: '700', marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 6 },
  smallBtn: { padding: 10, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center' },
  btn: { backgroundColor: '#2f9f7a', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnAlt: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
});