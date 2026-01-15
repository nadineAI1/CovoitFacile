import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../theme';
import { auth, db } from '../firebase';
import { getUserProfile, listUserRequests } from '../services/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';


export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const p = await getUserProfile(user.uid);
        const r = await listUserRequests(user.uid);
        if (mounted) {
          setProfile(p);
          setRequests(r || []);
        }
      } catch (e) {
        console.warn('Profile load error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  // bouton dans le header (haut droite)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={confirmSignOut} style={{ marginRight: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Quitter</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, signingOut]);

  const confirmSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: onSignOut },
    ]);
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // Clear fcmToken (optionnel) pour ne plus recevoir de notifications
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { fcmToken: null }).catch(() => {});
        } catch (err) {
          console.warn('Failed clearing fcmToken', err);
        }
      }

      // Sign out Firebase
      await signOut(auth);

      // Reset navigation stack to Welcome (root public)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (e) {
      console.error('Logout error', e);
      Alert.alert('Erreur', e.message || 'Impossible de se déconnecter');
    } finally {
      setSigningOut(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.reqRow}>
      <Text style={{ fontWeight: '700' }}>Trajet: {item.rideId}</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>{item.status}</Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Mon profil</Text>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>
                {(profile?.displayName || auth.currentUser?.email || 'U').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.name}>{profile?.displayName || auth.currentUser?.email}</Text>
            <Text style={styles.email}>{profile?.email || auth.currentUser?.email}</Text>
            <Text style={styles.small}>{profile?.phone || ''}</Text>
          </View>
        </View>

        {/* Bouton pour modifier le profil conducteur */}
        {profile?.role === 'driver' && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('DriverProfile')}
          >
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>Modifier profil conducteur</Text>
          </TouchableOpacity>
        )}

        {/* Bouton de déconnexion visible */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmSignOut}
          disabled={signingOut}
        >
          {signingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.logoutText}>Se déconnecter</Text>}
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 12, marginHorizontal: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Mes demandes</Text>
        <FlatList
          data={requests}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{ color: '#666' }}>Aucune demande</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { padding: 16, backgroundColor: Colors.primary },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  card: { marginTop: -20, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  avatar: { width: 84, height: 84, borderRadius: 12, backgroundColor: '#f0f0f0' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6e6e6' },
  avatarInitials: { fontSize: 22, fontWeight: '700', color: '#333' },
  name: { fontWeight: '700', fontSize: 18 },
  email: { color: '#666', marginTop: 6 },
  small: { color: '#666', marginTop: 4 },
  editBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  logoutBtn: { marginTop: 12, backgroundColor: '#ff4d4f', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '700' },
  reqRow: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' },
});