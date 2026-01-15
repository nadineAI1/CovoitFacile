
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import { auth } from '../firebase';
import { createUserProfile, getUserProfile } from '../services/firestore';
import { uploadImageAsync } from '../services/storage';

const VEHICLE_MAKES = ['Toyota', 'Nissan', 'Hyundai', 'Renault', 'Peugeot', 'Autre'];
const VEHICLE_MODELS_BY_MAKE = {
  Toyota: ['Corolla', 'Yaris', 'Hilux', 'Rav4'],
  Nissan: ['Sunny', 'Micra', 'Navara'],
  Hyundai: ['Accent', 'Elantra', 'Tucson'],
  Renault: ['Clio', 'Symbol', 'Kangoo'],
  Peugeot: ['208', '301', '308'],
  Autre: ['Autre'],
};
const COLORS = ['Blanc', 'Noir', 'Gris', 'Rouge', 'Bleu', 'Vert', 'Autre'];
const SEATS = ['2', '4', '5', '6', '7+'];

export default function DriverProfileScreen({ navigation, route }) {
  const me = auth.currentUser;
  const uid = me?.uid;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // profile fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // vehicle
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleSeats, setVehicleSeats] = useState('4');

  // location / map
  const [region, setRegion] = useState(null);
  const [marker, setMarker] = useState(null);

  // UI pickers
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerItems, setPickerItems] = useState([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [onPickerSelect, setOnPickerSelect] = useState(() => () => {});

  // trip type (optionnel: repris depuis MapSearch)
  const [pickedType, setPickedType] = useState(null);

  const isValidCoord = (c) => !!c && typeof c === 'object' && isFinite(c.latitude) && isFinite(c.longitude);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!uid) {
          Alert.alert('Erreur', 'Utilisateur non authentifié');
          navigation.goBack();
          return;
        }

        const p = await getUserProfile(uid);
        if (!mounted) return;

        if (p) {
          setDisplayName(p.displayName || '');
          setPhone(p.phone || '');
          setAvatarUrl(p.avatarUrl || null);
          setVehicleMake(p.vehicle?.make || '');
          setVehicleModel(p.vehicle?.model || '');
          setVehiclePlate(p.vehicle?.plate || '');
          setVehicleColor(p.vehicle?.color || '');
          setVehicleSeats(p.vehicle?.seats ? String(p.vehicle.seats) : '4');

          if (p.location) {
            // accept { lat, lng } or { latitude, longitude }
            const lat = p.location.lat ?? p.location.latitude;
            const lng = p.location.lng ?? p.location.longitude;
            if (isFinite(lat) && isFinite(lng)) {
              setMarker({ latitude: Number(lat), longitude: Number(lng) });
              setRegion({ latitude: Number(lat), longitude: Number(lng), latitudeDelta: 0.01, longitudeDelta: 0.01 });
            } else {
              console.warn('DriverProfile: invalid saved location in profile', p.location);
            }
          }
        }

        // if no region set, get device location
        if (!region) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            if (mounted) setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          } else {
            if (mounted) setRegion({ latitude: 36.9000, longitude: 7.7667, latitudeDelta: 0.1, longitudeDelta: 0.1 });
          }
        }
      } catch (e) {
        console.warn('DriverProfile load error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // If user returned from MapSearch with pickedLocation / pickedType, update marker and type
  useEffect(() => {
    const picked = route?.params?.pickedLocation;
    if (picked && typeof picked === 'object') {
      const lat = picked.latitude ?? picked.lat;
      const lng = picked.longitude ?? picked.lng;
      if (isFinite(lat) && isFinite(lng)) {
        setMarker({ latitude: Number(lat), longitude: Number(lng) });
        setRegion({ latitude: Number(lat), longitude: Number(lng), latitudeDelta: 0.01, longitudeDelta: 0.01 });
      } else {
        console.warn('DriverProfile: ignored invalid pickedLocation', picked);
      }
      navigation.setParams({ pickedLocation: undefined });
    }

    const t = route?.params?.pickedType;
    if (t) {
      setPickedType(t);
      navigation.setParams({ pickedType: undefined });
    }
  }, [route?.params?.pickedLocation, route?.params?.pickedType]);

  const openPicker = (title, items, onSelect) => {
    setPickerTitle(title);
    setPickerItems(items);
    setOnPickerSelect(() => onSelect);
    setPickerVisible(true);
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission', "Autorisation d'accès à la galerie requise.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.cancelled) setAvatarUri(result.uri);
    } catch (e) {
      console.warn('pickImage error', e);
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission', 'Accès à la caméra requis.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.cancelled) setAvatarUri(result.uri);
    } catch (e) {
      console.warn('takePhoto error', e);
    }
  };

  const onSave = async () => {
    if (!displayName.trim()) return Alert.alert('Erreur', 'Le nom est requis.');
    setSaving(true);
    try {
      let uploadedUrl = avatarUrl || null;
      if (avatarUri) {
        uploadedUrl = await uploadImageAsync(avatarUri, 'avatars');
        setAvatarUrl(uploadedUrl);
      }

      const payload = {
        displayName: displayName.trim(),
        phone: phone || null,
        avatarUrl: uploadedUrl || null,
        role: 'driver',
        vehicle: {
          make: vehicleMake || null,
          model: vehicleModel || null,
          plate: vehiclePlate || null,
          color: vehicleColor || null,
          seats: Number(vehicleSeats) || null,
        },
        location: marker ? { lat: marker.latitude, lng: marker.longitude } : null,
        updatedAt: new Date(),
      };

      await createUserProfile(uid, payload);
      Alert.alert('Profil enregistré', 'Ton profil conducteur a été mis à jour.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error('save driver profile error', e);
      Alert.alert('Erreur', e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <RNSafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={[]}
          ListHeaderComponent={
            <>
              <View style={{ padding: 16 }}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>Photo (profil ou véhicule)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>+</Text>
                    </View>
                  )}
                  <View style={{ marginLeft: 12 }}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}><Text style={{ color: Colors.primary }}>Choisir</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={takePhoto}><Text style={{ color: Colors.primary }}>Prendre une photo</Text></TouchableOpacity>
                  </View>
                </View>

                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Nom complet</Text>
                <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Ton nom complet" style={styles.input} />

                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Téléphone</Text>
                <TextInput value={phone} onChangeText={setPhone} placeholder="+229 ..." style={styles.input} keyboardType="phone-pad" />

                <Text style={{ fontWeight: '800', marginTop: 12, marginBottom: 8, color: Colors.primary }}>Informations véhicule</Text>

                <TouchableOpacity onPress={() => openPicker('Marque', VEHICLE_MAKES, (v) => { setVehicleMake(v); setVehicleModel(''); setPickerVisible(false); })}>
                  <View style={styles.input}>
                    <Text style={{ color: vehicleMake ? '#111' : '#999' }}>{vehicleMake || 'Marque (ex: Toyota)'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {
                  const models = VEHICLE_MODELS_BY_MAKE[vehicleMake] ?? VEHICLE_MODELS_BY_MAKE['Autre'];
                  openPicker('Modèle', models, (v) => { setVehicleModel(v); setPickerVisible(false); });
                }}>
                  <View style={styles.input}>
                    <Text style={{ color: vehicleModel ? '#111' : '#999' }}>{vehicleModel || 'Modèle (ex: Corolla)'}</Text>
                  </View>
                </TouchableOpacity>

                <TextInput value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="Plaque" style={styles.input} />

                <TouchableOpacity onPress={() => openPicker('Couleur', COLORS, (v) => { setVehicleColor(v); setPickerVisible(false); })}>
                  <View style={styles.input}>
                    <Text style={{ color: vehicleColor ? '#111' : '#999' }}>{vehicleColor || 'Couleur'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => openPicker('Places', SEATS, (v) => { setVehicleSeats(v); setPickerVisible(false); })}>
                  <View style={styles.input}>
                    <Text style={{ color: vehicleSeats ? '#111' : '#999' }}>{vehicleSeats || 'Places'}</Text>
                  </View>
                </TouchableOpacity>

                <Text style={{ fontWeight: '700', marginTop: 12, marginBottom: 8 }}>Sélectionner la position (carte)</Text>
                <Text style={{ marginBottom: 6, color: '#666' }}>Appuie sur la carte pour l'ouvrir en plein écran et choisir la position</Text>

                <View style={styles.mapContainer}>
                  {region ? (
                    <MapView
                      style={{ flex: 1 }}
                      initialRegion={region}
                      onLongPress={(e) => {
                        const { latitude, longitude } = e?.nativeEvent?.coordinate ?? {};
                        if (isFinite(latitude) && isFinite(longitude)) {
                          setMarker({ latitude: Number(latitude), longitude: Number(longitude) });
                          Alert.alert('Position', 'Position mise à jour par long press.');
                        } else {
                          console.warn('DriverProfile: ignored invalid coordinate from onLongPress', e?.nativeEvent?.coordinate);
                        }
                      }}
                      onPress={() => {
                        navigation.navigate('MapSearch', { initialRegion: region, marker });
                      }}
                    >
                      {marker ? (
                        <Marker
                          coordinate={{ latitude: Number(marker.latitude), longitude: Number(marker.longitude) }}
                          draggable
                          onDragEnd={(e) => {
                            const coord = e?.nativeEvent?.coordinate;
                            if (isFinite(coord.latitude) && isFinite(coord.longitude)) {
                              setMarker({ latitude: Number(coord.latitude), longitude: Number(coord.longitude) });
                            } else {
                              console.warn('DriverProfile: ignored invalid coordinate from onDragEnd', coord);
                            }
                          }}
                        />
                      ) : null}
                    </MapView>
                  ) : (
                    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <Text>Chargement carte...</Text>
                    </View>
                  )}
                </View>

                {/* Display pickedType if any */}
                {pickedType ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: '700' }}>Type sélectionné :</Text>
                    <Text style={{ color: '#333', marginTop: 4, fontSize: 14 }}>{pickedType}</Text>
                  </View>
                ) : null}

                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Enregistrer profil</Text>}
                </TouchableOpacity>
              </View>
            </>
          }
          renderItem={null}
        />

        {/* Modal Picker (simple dropdown modal) */}
        <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerVisible(false)}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <FlatList
                data={pickerItems}
                keyExtractor={(i, idx) => String(i) + idx}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalRow}
                    onPress={() => {
                      onPickerSelect(item);
                    }}
                  >
                    <Text style={styles.modalRowText}>{item}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
              />
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPickerVisible(false)}>
                <Text style={{ color: Colors.primary }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </RNSafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  avatar: { width: 84, height: 84, borderRadius: 8, backgroundColor: '#f0f0f0' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6e6e6' },
  avatarText: { fontSize: 28, color: '#666' },
  secondaryBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  mapContainer: { height: 220, borderRadius: 8, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  saveBtn: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },

  // modal picker
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', maxHeight: '60%', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  modalTitle: { fontWeight: '700', fontSize: 16, marginBottom: 8 },
  modalRow: { paddingVertical: 12 },
  modalRowText: { fontSize: 15 },
  modalCloseBtn: { marginTop: 12, alignItems: 'center' },
});