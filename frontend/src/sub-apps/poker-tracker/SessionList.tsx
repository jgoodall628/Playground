import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { getSessions, deleteSession, PokerSession } from './api';
import { formatMoney, profitColor, formatDuration } from './utils';
import NewSessionForm from './NewSessionForm';
import SessionDetail from './SessionDetail';
import SwipeableRow from './SwipeableRow';

export default function SessionList() {
  const [sessions, setSessions] = useState<PokerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editSession, setEditSession] = useState<PokerSession | null>(null);

  const load = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (showNew) {
    return (
      <NewSessionForm
        onSaved={() => { setShowNew(false); load(); }}
        onCancel={() => setShowNew(false)}
      />
    );
  }

  if (editSession) {
    return (
      <NewSessionForm
        session={editSession}
        onSaved={() => { setEditSession(null); load(); }}
        onCancel={() => setEditSession(null)}
      />
    );
  }

  if (selectedId != null) {
    return (
      <SessionDetail
        sessionId={selectedId}
        onBack={() => { setSelectedId(null); load(); }}
      />
    );
  }

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" color="#7C3AED" />;
  }

  const handleDelete = (s: PokerSession) => {
    Alert.alert('Delete Session', 'Delete this session and all its hands?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteSession(s.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        {sessions.length === 0 && (
          <Text style={styles.empty}>No sessions yet. Tap + to add one.</Text>
        )}
        {sessions.map((s) => (
          <SwipeableRow
            key={s.id}
            actions={[
              { label: 'Edit', color: '#7C3AED', onPress: () => setEditSession(s) },
              { label: 'Delete', color: '#ef4444', onPress: () => handleDelete(s) },
            ]}
          >
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedId(s.id)}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardDate}>{s.date}</Text>
                <Text style={[styles.cardProfit, { color: profitColor(s.profit_cents) }]}>
                  {formatMoney(s.profit_cents)}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardMeta}>
                  {[s.stakes, s.location, formatDuration(s.duration_minutes)].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
          </SwipeableRow>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => setShowNew(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  center: { flex: 1, justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 80 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardProfit: { fontSize: 16, fontWeight: '700' },
  cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
