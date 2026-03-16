import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { createSession } from './api';
import { parseDuration } from './utils';

interface Props {
  onSaved: () => void;
  onCancel: () => void;
}

export default function NewSessionForm({ onSaved, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [location, setLocation] = useState('');
  const [gameType, setGameType] = useState('');
  const [stakes, setStakes] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!date || !buyIn || !cashOut) {
      Alert.alert('Required', 'Date, buy-in, and cash-out are required.');
      return;
    }
    const buyInCents = Math.round(parseFloat(buyIn) * 100);
    const cashOutCents = Math.round(parseFloat(cashOut) * 100);
    if (isNaN(buyInCents) || isNaN(cashOutCents)) {
      Alert.alert('Invalid', 'Buy-in and cash-out must be numbers (e.g. 200).');
      return;
    }
    setSaving(true);
    try {
      await createSession({
        date,
        buy_in_cents: buyInCents,
        cash_out_cents: cashOutCents,
        location: location || undefined,
        game_type: gameType || undefined,
        stakes: stakes || undefined,
        duration_minutes: parseDuration(duration),
      });
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Session</Text>

      <Text style={styles.label}>Date *</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>Buy-in ($) *</Text>
      <TextInput style={styles.input} value={buyIn} onChangeText={setBuyIn} placeholder="200" keyboardType="decimal-pad" />

      <Text style={styles.label}>Cash-out ($) *</Text>
      <TextInput style={styles.input} value={cashOut} onChangeText={setCashOut} placeholder="250" keyboardType="decimal-pad" />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Commerce Casino" />

      <Text style={styles.label}>Game Type</Text>
      <TextInput style={styles.input} value={gameType} onChangeText={setGameType} placeholder="NL Hold'em" />

      <Text style={styles.label}>Stakes</Text>
      <TextInput style={styles.input} value={stakes} onChangeText={setStakes} placeholder="1/2" />

      <Text style={styles.label}>Duration (e.g. 2h 30m)</Text>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="2h 30m" />

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 14,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 8, borderWidth: 1,
    borderColor: '#7C3AED', alignItems: 'center',
  },
  cancelText: { color: '#7C3AED', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#7C3AED', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});
