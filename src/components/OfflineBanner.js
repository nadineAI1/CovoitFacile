import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * Simple banner to indicate offline state.
 * Usage: <OfflineBanner isConnected={isConnected} />
 */
export default function OfflineBanner({ isConnected = true }) {
  if (isConnected) return null;

  return (
    <Animated.View style={styles.container}>
      <Text style={styles.text}>Hors‑ligne — certaines fonctionnalités peuvent être limitées</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#c0392b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
});