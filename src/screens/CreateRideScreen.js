

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../theme';
import { createRide } from '../services/firestore';
import { auth, db } from '../firebase';
import { doc, getDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import DateTimePickerModal from 'react-native-modal-datetime-picker';



export default function CreateRideScreen({ navigation }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(''); 
  const [time, setTime] = useState(''); 
  const [seats, setSeats] = useState('3');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // date picker
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const validate = () => {
    if (!auth.currentUser) {
      Alert.alert('Erreur', "Utilisateur non authentifié. Déconnecte-toi puis reconnecte-toi.");
      return false;
    }
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Erreur', 'Départ et destination sont requis.');
      return false;
    }
    if (!date.trim()) {
      Alert.alert('Erreur', 'La date est requise (YYYY-MM-DD).');
      return false;
    }
    const seatsNum = Number(seats);
    if (!seats || isNaN(seatsNum) || seatsNum <= 0) {
      Alert.alert('Erreur', 'Nombre de places invalide.');
      return false;
    }
    return true;
  };

  const showDatePicker = () => setDatePickerVisible(true);
  const hideDatePicker = () => setDatePickerVisible(false);
  const handleConfirmDate = (selected) => {
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    if (!time) {
      const hh = String(selected.getHours()).padStart(2, '0');
      const mi = String(selected.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${mi}`);
    }
    hideDatePicker();
  };

  const onCreate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;

      // Check if user is verified
      const userSnap = await getDoc(doc(db, 'users', uid));
      const verified = userSnap.exists() && userSnap.data().verified === true;
      if (!verified) {
        setLoading(false);
        Alert.alert(
          'Compte non vérifié',
          'Vous devez soumettre vos documents et attendre la validation avant de créer un trajet.',
          [
            { text: 'Annuler' },
            { text: 'Vérifier maintenant', onPress: () => navigation.navigate('DriverVerification') },
          ]
        );
        return;
      }

   
      const payload = {
        driverId: uid,
        origin: origin.trim(),
        destination: destination.trim(),
        date: date.trim(),
        time: time.trim(),
        seats: Number(seats),
        price: price ? Number(price) : null,
        isActive: false, 
        createdAt: new Date().toISOString(),
      };

     
      const rideId = await createRide(payload);

      if (isActive) {
        try {
        
          const q = query(collection(db, 'rides'), where('driverId', '==', uid));
          const snap = await getDocs(q);
          const batch = writeBatch(db);
          snap.forEach((d) => {
            const rDoc = doc(db, 'rides', d.id);
            if (d.id === rideId) batch.update(rDoc, { isActive: true });
            else {
              const data = d.data();
              if (data && data.isActive) batch.update(rDoc, { isActive: false });
            }
          });
          await batch.commit();
        } catch (e) {
          console.warn('Error setting active ride batch', e);
  
        }
      }

      Alert.alert('Succès', 'Trajet créé', [{ text: 'OK', onPress: () => navigation.navigate('DriverRides') }]);
    } catch (e) {
      console.error('createRide error', e);
      Alert.alert('Erreur création trajet', e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Proposer un trajet</Text>
          <TextInput placeholder="Départ (ville ou adresse)" style={styles.input} value={origin} onChangeText={setOrigin} />
          <TextInput placeholder="Destination" style={styles.input} value={destination} onChangeText={setDestination} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput placeholder="Date (YYYY-MM-DD)" style={[styles.input, { flex: 1 }]} value={date} onChangeText={setDate} />
            <TextInput placeholder="Heure (HH:MM)" style={[styles.input, { width: 110 }]} value={time} onChangeText={setTime} />
            <TouchableOpacity style={styles.datePickerBtn} onPress={showDatePicker}><Text style={{ color: '#fff' }}>Pick</Text></TouchableOpacity>
          </View>
          <TextInput placeholder="Places disponibles" style={styles.input} keyboardType="numeric" value={seats} onChangeText={setSeats} />
          <TextInput placeholder="Prix (optionnel)" style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ marginRight: 12, fontWeight: '700' }}>Activer ce trajet</Text>
            <TouchableOpacity onPress={() => setIsActive((v) => !v)} style={[styles.switchLike, isActive && styles.switchLikeActive]}>
              <Text style={{ color: isActive ? '#fff' : '#333', fontWeight: '700' }}>{isActive ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={onCreate} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Création...' : 'Proposer'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <DateTimePickerModal isVisible={isDatePickerVisible} mode="datetime" onConfirm={handleConfirmDate} onCancel={() => setDatePickerVisible(false)} minimumDate={new Date()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: Colors.primary },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
  datePickerBtn: { backgroundColor: '#2f9f7a', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, justifyContent: 'center', marginLeft: 6 },
  btn: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  switchLike: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eee' },
  switchLikeActive: { backgroundColor: '#2f9f7a' },
});