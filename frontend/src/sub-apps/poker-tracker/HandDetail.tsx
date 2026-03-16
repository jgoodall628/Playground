import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { getHand, PokerHand } from './api';
import { formatMoney, profitColor } from './utils';

interface Props {
  sessionId: number;
  handId: number;
  onBack: () => void;
}

const STREET_ORDER = ['preflop', 'flop', 'turn', 'river'];

export default function HandDetail({ sessionId, handId, onBack }: Props) {
  const [hand, setHand] = useState<PokerHand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHand(sessionId, handId)
      .then(setHand)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#7C3AED" />;
  if (!hand) return null;

  const actionsByStreet: Record<string, typeof hand.actions> = {};
  for (const street of STREET_ORDER) {
    const acts = (hand.actions || []).filter((a) => a.street === street);
    if (acts.length > 0) actionsByStreet[street] = acts;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.cards}>{hand.hero_cards || '??'}</Text>
        {hand.hero_position && <Text style={styles.position}>{hand.hero_position}</Text>}
      </View>

      {hand.effective_stack_cents != null && (
        <Text style={styles.meta}>Stack: {formatMoney(hand.effective_stack_cents)}</Text>
      )}

      {Object.entries(actionsByStreet).map(([street, actions]) => (
        <View key={street} style={styles.streetBlock}>
          <Text style={styles.streetLabel}>{street.toUpperCase()}</Text>
          {(actions || []).map((a) => (
            <View key={a.id} style={styles.actionRow}>
              <Text style={styles.actor}>
                {a.actor === 'villain' && a.villain_position
                  ? `Villain (${a.villain_position})`
                  : 'Hero'}
              </Text>
              <Text style={styles.actionType}>{a.action_type}</Text>
              {a.amount_cents != null && (
                <Text style={styles.amount}>{formatMoney(a.amount_cents)}</Text>
              )}
            </View>
          ))}
        </View>
      ))}

      <View style={styles.result}>
        <Text style={styles.resultLabel}>Result</Text>
        {hand.pot_result_cents != null ? (
          <Text style={[styles.resultValue, { color: profitColor(hand.pot_result_cents) }]}>
            {formatMoney(hand.pot_result_cents)}
          </Text>
        ) : (
          <Text style={styles.resultValue}>—</Text>
        )}
      </View>

      {!!hand.notes && (
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{hand.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 20 },
  back: { marginBottom: 16 },
  backText: { color: '#7C3AED', fontSize: 15, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  cards: { fontSize: 28, fontWeight: '700', color: '#111827' },
  position: {
    fontSize: 14, fontWeight: '600', color: '#7C3AED',
    backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  meta: { color: '#6b7280', fontSize: 14, marginBottom: 16 },
  streetBlock: { marginBottom: 16 },
  streetLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 6 },
  actionRow: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 4,
  },
  actor: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },
  actionType: { fontSize: 14, color: '#111827', fontWeight: '600', textTransform: 'capitalize' },
  amount: { fontSize: 14, color: '#6b7280' },
  result: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginTop: 8,
  },
  resultLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  resultValue: { fontSize: 18, fontWeight: '700' },
  notes: { marginTop: 16, backgroundColor: '#fff', borderRadius: 10, padding: 14 },
  notesLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', marginBottom: 6 },
  notesText: { fontSize: 14, color: '#374151' },
});
