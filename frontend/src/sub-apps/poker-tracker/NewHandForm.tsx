import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { createHand } from './api';

const POSITIONS = ['BTN', 'CO', 'MP', 'UTG', 'SB', 'BB'];
const ACTION_TYPES = ['fold', 'check', 'call', 'bet', 'raise'];
const STREETS = ['preflop', 'flop', 'turn', 'river'];
const ACTORS = ['hero', 'villain'];

interface ActionInput {
  street: string;
  actor: string;
  villain_position: string;
  action_type: string;
  amount: string;
}

interface Props {
  sessionId: number;
  onSaved: () => void;
  onCancel: () => void;
}

function Picker({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.pickerBlock}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function NewHandForm({ sessionId, onSaved, onCancel }: Props) {
  const [heroCards, setHeroCards] = useState('');
  const [heroPosition, setHeroPosition] = useState('');
  const [stack, setStack] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [actions, setActions] = useState<ActionInput[]>([]);
  const [saving, setSaving] = useState(false);

  const addAction = () => {
    setActions([...actions, { street: 'preflop', actor: 'hero', villain_position: '', action_type: 'call', amount: '' }]);
  };

  const updateAction = (index: number, field: keyof ActionInput, value: string) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const poker_actions_attributes = actions.map((a, i) => ({
        street: a.street,
        actor: a.actor,
        villain_position: a.actor === 'villain' ? a.villain_position : undefined,
        action_type: a.action_type,
        amount_cents: a.amount ? Math.round(parseFloat(a.amount) * 100) : undefined,
        sequence: i + 1,
      }));

      await createHand(sessionId, {
        hero_cards: heroCards || undefined,
        hero_position: heroPosition || undefined,
        effective_stack_cents: stack ? Math.round(parseFloat(stack) * 100) : undefined,
        pot_result_cents: result ? Math.round(parseFloat(result) * 100) : undefined,
        notes: notes || undefined,
        poker_actions_attributes,
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
      <Text style={styles.title}>Add Hand</Text>

      <Text style={styles.label}>Hero Cards</Text>
      <TextInput style={styles.input} value={heroCards} onChangeText={setHeroCards} placeholder="Ah Kd" autoCapitalize="none" />

      <Picker label="Hero Position" options={POSITIONS} value={heroPosition} onChange={setHeroPosition} />

      <Text style={styles.label}>Effective Stack ($)</Text>
      <TextInput style={styles.input} value={stack} onChangeText={setStack} placeholder="200" keyboardType="decimal-pad" />

      <Text style={styles.label}>Result ($, positive=won, negative=lost)</Text>
      <TextInput style={styles.input} value={result} onChangeText={setResult} placeholder="-50 or 120" keyboardType="numbers-and-punctuation" />

      <Text style={styles.label}>Notes</Text>
      <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <Text style={styles.sectionTitle}>Actions</Text>
      {actions.map((a, i) => (
        <View key={i} style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionNum}>Action {i + 1}</Text>
            <TouchableOpacity onPress={() => removeAction(i)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
          <Picker label="Street" options={STREETS} value={a.street} onChange={(v) => updateAction(i, 'street', v)} />
          <Picker label="Actor" options={ACTORS} value={a.actor} onChange={(v) => updateAction(i, 'actor', v)} />
          {a.actor === 'villain' && (
            <Picker label="Villain Position" options={POSITIONS} value={a.villain_position} onChange={(v) => updateAction(i, 'villain_position', v)} />
          )}
          <Picker label="Action" options={ACTION_TYPES} value={a.action_type} onChange={(v) => updateAction(i, 'action_type', v)} />
          {['bet', 'raise', 'call'].includes(a.action_type) && (
            <>
              <Text style={styles.label}>Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={a.amount}
                onChangeText={(v) => updateAction(i, 'amount', v)}
                placeholder="12"
                keyboardType="decimal-pad"
              />
            </>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addActionBtn} onPress={addAction}>
        <Text style={styles.addActionText}>+ Add Action</Text>
      </TouchableOpacity>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Hand</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12,
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  pickerBlock: { marginBottom: 12 },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#d1d5db', marginRight: 8, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  actionNum: { fontSize: 14, fontWeight: '600', color: '#374151' },
  removeText: { color: '#dc2626', fontSize: 13 },
  addActionBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#7C3AED',
    borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 20,
  },
  addActionText: { color: '#7C3AED', fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#7C3AED', alignItems: 'center',
  },
  cancelText: { color: '#7C3AED', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#7C3AED', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});
