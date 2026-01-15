import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';


export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        {/* GIF animé placé dans src/assets/car-animation.gif */}
        <Image
          source={require('../assets/car-animation.gif')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.center}>
        <Text style={styles.title}>CovoitFacile</Text>
        <Text style={styles.subtitle}>Partage ton trajet. Rencontres. Économise.</Text>
      </View>

      <View style={styles.actions}>
       <TouchableOpacity
  style={styles.driverBtn}
  onPress={() => navigation.navigate('DriverAuth', { screen: 'Register', params: { role: 'driver' } })}
  accessibilityLabel="Je suis conducteur"
>
  <Text style={styles.driverText}>Je suis conducteur·rice</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.studentBtn}
  onPress={() => navigation.navigate('StudentAuth', { screen: 'Register', params: { role: 'student' } })}
  accessibilityLabel="Je suis étudiant"
>
  <Text style={styles.studentText}>Je suis étudiant·e</Text>
</TouchableOpacity>
        <Text style={styles.note}>Tu pourras basculer ton rôle dans ton profil si besoin</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', justifyContent:'space-between' },
  top: { alignItems:'center', marginTop: 80 },
  image: { width: 400, height: 300},
  center: { alignItems:'center', paddingHorizontal:20 },
  title: { fontSize:32, fontWeight:'800', color: Colors.primary },
  subtitle: { marginTop:8, color:'#666', textAlign:'center' },
  actions: { padding:20 },
  driverBtn: { backgroundColor: Colors.primary, paddingVertical:14, borderRadius:10, alignItems:'center', marginBottom:12 },
  driverText: { color:'#fff', fontWeight:'700' },
  studentBtn: { borderWidth:1, borderColor: Colors.primary, paddingVertical:14, borderRadius:10, alignItems:'center' },
  studentText: { color: Colors.primary, fontWeight:'700' },
  note: { textAlign:'center', color:'#999', marginTop:12 }
});