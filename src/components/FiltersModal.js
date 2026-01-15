import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';

export default function FiltersModal({ visible, onClose, onApply, initialFilters = {} }) {
  const [tripType, setTripType] = useState(initialFilters.tripType || 'any'); // 'any' | 'course' | 'inter'
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice != null ? String(initialFilters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice != null ? String(initialFilters.maxPrice) : '');
  const [minSeats, setMinSeats] = useState(initialFilters.minSeats != null ? String(initialFilters.minSeats) : '');

  useEffect(() => {
    setTripType(initialFilters.tripType || 'any');
    setMinPrice(initialFilters.minPrice != null ? String(initialFilters.minPrice) : '');
    setMaxPrice(initialFilters.maxPrice != null ? String(initialFilters.maxPrice) : '');
    setMinSeats(initialFilters.minSeats != null ? String(initialFilters.minSeats) : '');
  }, [initialFilters, visible]);

  function handleApply() {
    const payload = {
      tripType: tripType === 'any' ? null : tripType,
      minPrice: minPrice.trim() ? Number(minPrice) : null,
      maxPrice: maxPrice.trim() ? Number(maxPrice) : null,
      minSeats: minSeats.trim() ? Number(minSeats) : null,
    };
    onApply && onApply(payload);
    onClose && onClose();
  }

  function handleReset() {
    setTripType('any');
    setMinPrice('');
    setMaxPrice('');
    setMinSeats('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtres</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>Fermer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.label}>Type de course</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.chip, tripType === 'any' && styles.chipActive]}
                onPress={() => setTripType('any')}
              >
                <Text style={[styles.chipText, tripType === 'any' && styles.chipTextActive]}>Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, tripType === 'course' && styles.chipActive]}
                onPress={() => setTripType('course')}
              >
                <Text style={[styles.chipText, tripType === 'course' && styles.chipTextActive]}>Course</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, tripType === 'inter' && styles.chipActive]}
                onPress={() => setTripType('inter')}
              >
                <Text style={[styles.chipText, tripType === 'inter' && styles.chipTextActive]}>Inter Wilayas</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Prix (DZD)</Text>
            <View style={{ flexDirection: 'row' }}>
              <TextInput
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
                placeholder="Min"
                style={[styles.input, { marginRight: 8, flex: 1 }]}
              />
              <TextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                placeholder="Max"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <Text style={styles.label}>Places minimum</Text>
            <TextInput
              value={minSeats}
              onChangeText={setMinSeats}
              keyboardType="numeric"
              placeholder="Ex: 1"
              style={styles.input}
            />

            <View style={styles.actions}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 16,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  close: { color: '#0b6563', fontWeight: '700' },

  label: { marginTop: 12, marginBottom: 6, color: '#444', fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center' },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f2f2f2',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#0b6563',
  },
  chipText: { color: '#333', fontWeight: '700' },
  chipTextActive: { color: '#fff' },

  input: {
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    marginBottom: 6,
  },

  actions: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#eef6f8',
  },
  resetText: { color: '#0b6563', fontWeight: '700' },
  applyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#0b6563',
  },
  applyText: { color: '#fff', fontWeight: '700' },
});