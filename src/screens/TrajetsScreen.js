import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons'; 


export default function TrajetsScreen({ navigation }) {
  const [tripType, setTripType] = useState('course');
  const [destination, setDestination] = useState('');
  const [price, setPrice] = useState('');
  const initialRegion = useMemo(
    () => ({
      latitude: 36.9000,
      longitude: 7.7667,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
    []
  );

  const onFindDriver = () => {
    // Navigation sécurisée : utilise le root navigator pour éviter l'erreur RESET/NAVIGATE
    try {
      // vérifie d'abord que l'utilisateur a mis une destination
      if (!destination.trim()) {
        return Alert.alert('Destination requise', 'Indique ta destination avant de chercher un chauffeur.');
      }

   
      const rootNav = navigation.getRoot ? navigation.getRoot() : null;
      if (rootNav && typeof rootNav.navigate === 'function') {
    
        rootNav.navigate('SearchResults', { destination, tripType, price: price || null });
      } else {

        Alert.alert('Recherche lancée', `Destination: ${destination}\nType: ${tripType}\nPrix: ${price || '—'}`);
      }
    } catch (e) {
      console.warn('onFindDriver navigation failed', e);
      Alert.alert('Erreur', 'Impossible de lancer la recherche pour le moment.');
    }
  };

  const onOpenMapSearch = () => {
  
    try {
      const rootNav = navigation.getRoot ? navigation.getRoot() : null;
      if (rootNav && typeof rootNav.navigate === 'function') {
        rootNav.navigate('MapSearch');
        return;
      }
      navigation.navigate('MapSearch');
    } catch (e) {
      console.warn('openMapSearch failed', e);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la recherche de carte.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trajets</Text>
      </View>

      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Marker coordinate={{ latitude: initialRegion.latitude, longitude: initialRegion.longitude }} />
      </MapView>

      {/* Floating menu button (hamburger) */}
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => {

          Alert.alert('Menu', 'Ouvre le menu');
        }}
      >
        <Ionicons name="menu" size={22} color="#0b6563" />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.sheetContent}>
          {/* Trip types */}
          <View style={styles.tripTypes}>
            <TouchableOpacity
              onPress={() => setTripType('course')}
              style={[styles.typeBtn, tripType === 'course' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeText, tripType === 'course' && styles.typeTextActive]}>Course</Text>
              <Text style={styles.seats}>🚗 4</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTripType('inter')}
              style={[styles.typeBtn, tripType === 'inter' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeText, tripType === 'inter' && styles.typeTextActive]}>Inter Wilayas</Text>
              <Text style={styles.seats}>🧳</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTripType('plus')}
              style={[styles.typeBtn, tripType === 'plus' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeText, tripType === 'plus' && styles.typeTextActive]}>Plus</Text>
              <Text style={styles.seats}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Current city badge */}
          <View style={styles.cityRow}>
            <View style={styles.cityDot} />
            <Text style={styles.cityText}>Guelma (Guelma)</Text>
          </View>

          {/* Destination input (tappable to open map search) */}
          <TouchableOpacity style={styles.inputRow} onPress={onOpenMapSearch} activeOpacity={0.8}>
            <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="À"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor="#999"
        
            />
          </TouchableOpacity>

          {/* Price / propose your price */}
          <View style={styles.inputRow}>
            <Ionicons name="cash-outline" size={18} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Proposez votre prix (optionnel)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.editIcon} onPress={() => Alert.alert('Prix', 'Modifier le prix')}>
              <Ionicons name="pencil" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaBtn} onPress={onFindDriver}>
              <Text style={styles.ctaText}>Trouver un chauffeur</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => {
                // ouvrir filtre avancé si tu as
                Alert.alert('Filtres', 'Ouvre le menu de filtres');
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#0b6563" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 60,
    backgroundColor: '#0b6563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  map: { flex: 1 },

  menuBtn: {
    position: 'absolute',
    left: 14,
    top: Platform.OS === 'ios' ? 50 : 20,
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 16,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  sheetContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  tripTypes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typeBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f6f6f6',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#e6fff7',
    borderWidth: 1,
    borderColor: '#bfeee0',
  },
  typeText: { fontWeight: '700', color: '#333' },
  typeTextActive: { color: '#0b6563' },
  seats: { marginTop: 6, color: '#666', fontSize: 12 },

  cityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cityDot: { width: 12, height: 12, borderRadius: 12, backgroundColor: '#18a201', marginRight: 8 },
  cityText: { fontWeight: '700', color: '#0b6563' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 16, color: '#111' },
  editIcon: { marginLeft: 8 },

  ctaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ctaBtn: {
    flex: 1,
    backgroundColor: '#bff06f',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#06341c', fontWeight: '800', fontSize: 16 },
  filterBtn: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
});