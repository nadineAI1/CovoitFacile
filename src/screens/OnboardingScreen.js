import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';

export default function OnboardingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenue sur CovoitFacile</Text>
        <Text style={styles.subtitle}>Choisis ton rôle pour commencer</Text>
      </View>

      <View style={styles.hero}>
        <Image source={{ uri: 'https://via.placeholder.com/360x160.png?text=CovoitFacile' }} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnDriver} onPress={() => navigation.replace('DriverAuth')}>
          <Text style={styles.btnDriverText}>Je suis conducteur·rice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnStudent} onPress={() => navigation.replace('StudentAuth')}>
          <Text style={styles.btnStudentText}>Je suis étudiant·e</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: Platform.OS === 'ios' ? 48 : 28, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  subtitle: { color: '#666', marginTop: 8 },
  hero: { marginTop: 24, alignItems: 'center' },
  image: { width: '90%', height: 160, borderRadius: 12, backgroundColor: '#fff' },
  actions: { marginTop: 36, paddingHorizontal: 20 },
  btnDriver: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  btnDriverText: { color: '#fff', fontWeight: '700' },
  btnStudent: { borderWidth: 1, borderColor: Colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnStudentText: { color: Colors.primary, fontWeight: '700' },
});