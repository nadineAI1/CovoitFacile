import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import { auth } from '../firebase';
import { listenRidesByDriver } from '../services/firestore';

function toMillis(createdAt) {
  if (!createdAt) return 0;

  if (createdAt.toMillis) return createdAt.toMillis();

  if (createdAt.getTime) return createdAt.getTime();

  if (typeof createdAt === 'number') return createdAt;
  return 0;
}

export default function DriverDashboard({ navigation }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const me = auth.currentUser;

  useEffect(() => {
    let unsub = null;
    const uid = me?.uid;
    console.log('[DriverDashboard] current uid =', uid);

    if (!uid) {
      setLoading(false);
      setRides([]);
      return;
    }

    unsub = listenRidesByDriver(uid, (rows) => {
      console.log('[DriverDashboard] rides raw ->', rows);

      const sorted = rows.slice().sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setRides(sorted);
      setLoading(false);
    }, false);

    return () => {
      if (unsub) unsub();
    };
  }, [me?.uid]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes trajets</Text>

        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileBtnText}>Ouvrir Profil</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16 }}>
        {rides.length === 0 ? (
          <Text style={{ color: '#333' }}>Aucun trajet pour le moment.</Text>
        ) : (
          <FlatList
            data={rides}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RideDetails', { rideId: item.id, ride: item })}>
                <Text style={{ fontWeight: '700' }}>{item.origin} → {item.destination}</Text>
                <Text style={{ color: '#666', marginTop: 4 }}>{item.date} • places: {item.seatsAvailable}/{item.seatsTotal}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor: Colors.background },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth:1, borderColor:'#eee', alignItems:'flex-start' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  profileBtn: { marginTop: 12, backgroundColor: Colors.primary, padding: 10, borderRadius: 8, alignSelf: 'stretch' },
  profileBtnText: { color:'#fff', fontWeight:'700', textAlign:'center' },
  card: { backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:12, borderWidth:1, borderColor:'#eee' }
});