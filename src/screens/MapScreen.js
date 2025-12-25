import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';
import RideBottomSheet from './RideBottomSheet';
import { Colors } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen({ navigation }) {
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['14%', '44%'], []);

  const openBottom = useCallback(() => bottomSheetRef.current?.expand(), []);

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={{ latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        <Marker coordinate={{ latitude: 48.857, longitude: 2.352 }} title="Pickup" description="Point de prise en charge" />
      </MapView>

      <TouchableOpacity style={styles.fab} onPress={openBottom}>
        <Ionicons name="ios-location-sharp" size={20} color="#fff" />
      </TouchableOpacity>

      <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints} handleIndicatorStyle={{ backgroundColor: '#ddd' }}>
        <RideBottomSheet navigation={navigation} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  fab: { position: 'absolute', right: 18, bottom: 180, backgroundColor: Colors.primary, padding: 12, borderRadius: 50, elevation: 6 },
});