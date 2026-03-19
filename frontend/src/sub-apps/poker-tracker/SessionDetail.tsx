import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { getSession, deleteHand, PokerSession, PokerHandSummary } from './api';
import { formatMoney, profitColor, formatDuration } from './utils';
import NewHandForm from './NewHandForm';
import HandDetail from './HandDetail';
import SwipeableRow from './SwipeableRow';

interface Props {
  sessionId: number;
  onBack: () => void;
}

export default function SessionDetail({ sessionId, onBack }: Props) {
  const [session, setSession] = useState<PokerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewHand, setShowNewHand] = useState(false);
  const [selectedHandId, setSelectedHandId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await getSession(sessionId);
      setSession(data);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (showNewHand) {
    return (
      <NewHandForm
        sessionId={sessionId}
        onSaved={() => { setShowNewHand(false); load(); }}
        onCancel={() => setShowNewHand(false)}
      />
    );
  }

  if (selectedHandId != null) {
    return (
      <HandDetail
        sessionId={sessionId}
        handId={selectedHandId}
        onBack={() => setSelectedHandId(null)}
      />
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#7C3AED" />;
  if (!session) return null;

  const hands: PokerHandSummary[] = session.hands || [];

  const handleDeleteHand = (handId: number) => {
    Alert.alert('Delete Hand', 'Delete this hand and all its actions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteHand(sessionId, handId);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>← Sessions</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.date}>{session.date}</Text>
          {session.stakes && <Text style={styles.stakes}>{session.stakes}</Text>}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Buy-in</Text>
            <Text style={styles.summaryValue}>{formatMoney(session.buy_in_cents)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Cash-out</Text>
            <Text style={styles.summaryValue}>{formatMoney(session.cash_out_cents)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Profit</Text>
            <Text style={[styles.summaryValue, { color: profitColor(session.profit_cents) }]}>
              {formatMoney(session.profit_cents)}
            </Text>
          </View>
        </View>

        {session.duration_minutes != null && (
          <Text style={styles.meta}>Duration: {formatDuration(session.duration_minutes)}</Text>
        )}
        {session.location && <Text style={styles.meta}>Location: {session.location}</Text>}

        <Text style={styles.sectionTitle}>Hands ({hands.length})</Text>

        {hands.length === 0 && (
          <Text style={styles.empty}>No hands yet. Tap &quot;Add Hand&quot; to log one.</Text>
        )}

        {hands.map((h) => (
          <SwipeableRow
            key={h.id}
            actions={[
              { label: 'Delete', color: '#ef4444', onPress: () => handleDeleteHand(h.id) },
            ]}
          >
            <TouchableOpacity style={styles.handInfo} onPress={() => setSelectedHandId(h.id)}>
              <Text style={styles.handCards}>{h.hero_cards || '??'}</Text>
              {h.hero_position && <Text style={styles.handPosition}>{h.hero_position}</Text>}
              {h.pot_result_cents != null && (
                <Text style={[styles.handResult, { color: profitColor(h.pot_result_cents) }]}>
                  {formatMoney(h.pot_result_cents)}
                </Text>
              )}
            </TouchableOpacity>
          </SwipeableRow>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowNewHand(true)}>
        <Text style={styles.fabText}>+ Add Hand</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 20, paddingBottom: 100 },
  back: { marginBottom: 16 },
  backText: { color: '#7C3AED', fontSize: 15, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  date: { fontSize: 22, fontWeight: '700', color: '#111827' },
  stakes: {
    fontSize: 14, color: '#7C3AED', backgroundColor: '#ede9fe',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, fontWeight: '600',
  },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  summaryLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { color: '#6b7280', fontSize: 13, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 10 },
  empty: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 20 },
  handInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    backgroundColor: '#fff', borderRadius: 10,
  },
  handCards: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  handPosition: {
    fontSize: 12, color: '#7C3AED', backgroundColor: '#ede9fe',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontWeight: '600',
  },
  handResult: { fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#7C3AED', borderRadius: 12, padding: 16,
    alignItems: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
