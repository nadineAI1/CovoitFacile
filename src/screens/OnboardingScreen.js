import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout } from '../theme';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  return (
    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.brand}>rideo</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Trajets simples et partagés pour étudiants</Text>
        <Text style={styles.subtitle}>Economique • Sécurisé • Rapide</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.primaryBtnText}>Commencer</Text>
        </TouchableOpacity>
      </View>

      <Image source={require('../assets/téléchargement (12).jpg')} style={styles.bgPattern} resizeMode="cover" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 80, alignItems: 'center' },
  brand: { color: Colors.white, fontSize: 48, fontWeight: '800' },
  card: {
    width: width * 0.86,
    backgroundColor: Colors.white,
    borderRadius: Layout.cardRadius,
    padding: Layout.padding,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  title: { fontSize: 20, color: Colors.text, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { color: Colors.muted, textAlign: 'center', marginBottom: 14 },
  primaryBtn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontWeight: '700' },
  bgPattern: { position: 'absolute', bottom: -20, width: width * 1.3, height: 200, opacity: 0.12 },
});