import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestoreService from '../../services/firestore';
import { auth } from '../../firebase';

export default function RequestStatusScreen({ route, navigation }) {
  const requestId = route?.params?.requestId;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const me = auth.currentUser;

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = firestoreService.listenRequest(requestId, (r) => {
      setRequest(r);
      setLoading(false);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [requestId]);

  const onCancel = async () => {
    if (!requestId) return;

    try {
      await firestoreService.updateRequest(requestId, {
        status: 'cancelled',
        cancelledAt: new Date(),
      });
      Alert.alert('Annulé', 'Votre demande a été annulée.');
      navigation.goBack();
    } catch (e) {
      console.warn('cancel error', e);
      Alert.alert('Erreur', 'Impossible d\'annuler la demande.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={{ flex:1, padding:16 }}>
        <Text style={{ fontWeight:'800', fontSize:18 }}>Requête introuvable</Text>
        <Text style={{ marginTop:8 }}>La requête demandée est introuvable ou a été supprimée.</Text>
      </SafeAreaView>
    );
  }

  const status = (request.status || 'pending').toLowerCase();

  return (
    <SafeAreaView style={{ flex:1, padding:16 }}>
      <Text style={{ fontWeight:'800', fontSize:18 }}>Statut de la demande</Text>

      <View style={{ marginTop:12, padding:12, backgroundColor:'#fff', borderRadius:8 }}>
        <Text style={{ fontWeight:'700' }}>Statut actuel</Text>
        <Text style={{ marginTop:8, fontSize:16 }}>{status.toUpperCase()}</Text>

        {request.rideId ? (
          <Text style={{ marginTop:8, color:'#666' }}>
            Requête liée à un trajet (rideId: {request.rideId})
          </Text>
        ) : (
          <Text style={{ marginTop:8, color:'#666' }}>
            Demande ouverte (visible par les conducteurs)
          </Text>
        )}

        {(status === 'accepted' || status === 'assigned') && (
          <>
            <Text style={{ marginTop:8 }}>
              Conducteur assigné: {request.driverId || '—'}
            </Text>

            {request.conversationId ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2f9f7a', marginTop: 12 }]}
                onPress={() =>
                  navigation.navigate('Chat', { conversationId: request.conversationId })
                }
              >
                <Text style={{ color:'#fff', fontWeight:'700' }}>Ouvrir le chat</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ marginTop:8, color:'#666' }}>
                En attente de création de conversation...
              </Text>
            )}
          </>
        )}

        {status === 'open' && (
          <Text style={{ marginTop:8, color:'#666' }}>
            Ta demande ouverte est publiée et visible par les conducteurs.
          </Text>
        )}

        {status === 'pending' && (
          <Text style={{ marginTop:8, color:'#666' }}>
            En attente d'une réponse du conducteur.
          </Text>
        )}

        {status === 'cancelled' && (
          <Text style={{ marginTop:8, color:'#666' }}>
            Cette demande a été annulée.
          </Text>
        )}

        <View style={{ flexDirection:'row', marginTop:14 }}>
          {status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor:'#ccc', marginRight:8 }]}
              onPress={onCancel}
            >
              <Text>Annuler</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor:'#fff', borderWidth:1, borderColor:'#eee' }]}
            onPress={() => navigation.goBack()}
          >
            <Text>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    padding:12,
    borderRadius:8,
    alignItems:'center',
    justifyContent:'center',
  },
});
