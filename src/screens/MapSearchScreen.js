import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapSearchScreen({ navigation, route }) {
  const pickFor = route?.params?.pickFor || 'origin';
  const onPick = route?.params?.onPick;
  const returnToStack = route?.params?.returnToStack || 'Student';
  const returnScreen = route?.params?.returnScreen || 'RequestRide';

  const [marker, setMarker] = useState(null);

  useEffect(() => {

  }, []);

  const onMapPress = (e) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;
    setMarker({ lat: coord.latitude, lng: coord.longitude, label: `Picked ${coord.latitude.toFixed(6)},${coord.longitude.toFixed(6)}` });
  };

  const onConfirm = () => {
    if (!marker) return Alert.alert('Sélectionnez un point', 'Appuie sur la carte pour placer le marqueur puis confirme.');
    const loc = { lat: marker.lat, lng: marker.lng, label: marker.label };

    if (onPick && typeof onPick === 'function') {
      try {
        onPick(loc);
      } catch (e) {
        console.warn('MapSearchScreen: onPick callback threw', e);
      }
      navigation.goBack();
      return;
    }

    try {
      navigation.navigate(returnToStack, {
        screen: returnScreen,
        params: {
          [`${pickFor}Coord`]: loc,
          pickedLocation: loc,
          pickFor,
        },
      });
    } catch (e) {
      console.warn('MapSearchScreen: navigate to return stack failed', e);
      try {
        navigation.navigate(returnScreen, { [`${pickFor}Coord`]: loc });
      } catch (err) {
        console.warn('MapSearchScreen: fallback navigation failed', err);
      } finally {
        navigation.goBack();
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude: 36.9, longitude: 7.76, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
        onPress={onMapPress}
        showsUserLocation
      >
        {marker && <Marker coordinate={{ latitude: marker.lat, longitude: marker.lng }} />}
      </MapView>

      <View style={styles.sheet}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Sélectionne {pickFor}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={onConfirm}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnAlt, { width: 100 }]} onPress={() => navigation.goBack()}>
            <Text>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 6,
  },
  btn: { backgroundColor: '#2f9f7a', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnAlt: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
});