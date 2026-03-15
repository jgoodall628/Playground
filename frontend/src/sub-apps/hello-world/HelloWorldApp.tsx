import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HelloWorldApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>👋</Text>
      <Text style={styles.title}>hello kat</Text>
      <Text style={styles.subtitle}>Your first sub-app is running.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4ade80',
  },
});
