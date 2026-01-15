import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';

export default function MapFullScreen({ route, navigation }) {

  const initialRegion = route?.params?.initialRegion ?? {
    latitude: 6.3703,
    longitude: 2.3912,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
  const initialMarker = route?.params?.marker ?? null;

  const [region, setRegion] = useState(initialRegion);
  const [marker, setMarker] = useState(() => {

    if (
      initialMarker &&
      typeof initialMarker === 'object' &&
      isFinite(initialMarker.latitude) &&
      isFinite(initialMarker.longitude)
    ) {
      return { latitude: Number(initialMarker.latitude), longitude: Number(initialMarker.longitude) };
    }
    return { latitude: initialRegion.latitude, longitude: initialRegion.longitude };
  });

  useEffect(() => {
    navigation.setOptions({ title: 'Sélectionner la position' });
  }, [navigation]);

  const isValidCoord = (c) => !!c && typeof c === 'object' && isFinite(c.latitude) && isFinite(c.longitude);

  const onConfirm = () => {
    if (!isValidCoord(marker)) {
      console.warn('MapFullScreen: invalid marker on confirm', marker);
      return;
    }
 
    navigation.navigate({
      name: 'DriverProfile',
      params: { pickedLocation: { latitude: Number(marker.latitude), longitude: Number(marker.longitude) } },
      merge: true,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} // do NOT pass null
        initialRegion={region}
        onRegionChangeComplete={(r) => setRegion(r)}
        onLongPress={(e) => {
          const coord = e?.nativeEvent?.coordinate;
          if (isValidCoord(coord)) {
            setMarker({ latitude: Number(coord.latitude), longitude: Number(coord.longitude) });
          } else {
            console.warn('MapFullScreen: ignored invalid coordinate from onLongPress', coord);
          }
        }}
      >
        {isValidCoord(marker) ? (
          <>
            {console.warn && console.warn('MapFullScreen rendering marker:', marker)}
            <Marker
              coordinate={{ latitude: Number(marker.latitude), longitude: Number(marker.longitude) }}
              draggable
              onDragEnd={(e) => {
                const coord = e?.nativeEvent?.coordinate;
                if (isValidCoord(coord)) {
                  setMarker({ latitude: Number(coord.latitude), longitude: Number(coord.longitude) });
                } else {
                  console.warn('MapFullScreen: ignored invalid coordinate from onDragEnd', coord);
                }
              }}
            />
          </>
        ) : null}
      </MapView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: Colors.primary }}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmer la position</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cancelBtn: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    width: 120,
    alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
});