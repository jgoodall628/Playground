import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { getAllHands, getSessions, deleteHand, PokerHand, PokerSession } from './api';
import { formatMoney, profitColor } from './utils';
import HandDetail from './HandDetail';
import NewHandForm from './NewHandForm';
import SwipeableRow from './SwipeableRow';

const POSITIONS = ['BTN', 'CO', 'MP', 'UTG', 'SB', 'BB'];

export default function AllHandsList() {
  const [hands, setHands] = useState<PokerHand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPos, setFilterPos] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [selectedHand, setSelectedHand] = useState<{ sessionId: number; handId: number } | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [sessions, setSessions] = useState<PokerSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [newHandSessionId, setNewHandSessionId] = useState<number | null>(null);

  const loadHands = useCallback(async () => {
    try {
      const data = await getAllHands();
      setHands(data);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHands(); }, [loadHands]);

  const handleDelete = (h: PokerHand) => {
    const sessionId = h.session?.id ?? h.poker_session_id;
    Alert.alert('Delete Hand', 'Delete this hand and all its actions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteHand(sessionId, h.id);
          loadHands();
        },
      },
    ]);
  };

  const openSessionPicker = async () => {
    setLoadingSessions(true);
    setShowSessionPicker(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
      setShowSessionPicker(false);
    } finally {
      setLoadingSessions(false);
    }
  };

  if (newHandSessionId != null) {
    return (
      <NewHandForm
        sessionId={newHandSessionId}
        onSaved={() => { setNewHandSessionId(null); loadHands(); }}
        onCancel={() => setNewHandSessionId(null)}
      />
    );
  }

  if (selectedHand) {
    return (
      <HandDetail
        sessionId={selectedHand.sessionId}
        handId={selectedHand.handId}
        onBack={() => { setSelectedHand(null); loadHands(); }}
      />
    );
  }

  const filtered = hands.filter((h) => {
    if (filterPos && h.hero_position !== filterPos) return false;
    if (filterResult === 'won' && (h.pot_result_cents == null || h.pot_result_cents <= 0)) return false;
    if (filterResult === 'lost' && (h.pot_result_cents == null || h.pot_result_cents >= 0)) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['', ...POSITIONS].map((p) => (
              <TouchableOpacity
                key={p || 'all-pos'}
                style={[styles.chip, filterPos === p && styles.chipActive]}
                onPress={() => setFilterPos(p)}
              >
                <Text style={[styles.chipText, filterPos === p && styles.chipTextActive]}>
                  {p || 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.resultFilter}>
            {['', 'won', 'lost'].map((r) => (
              <TouchableOpacity
                key={r || 'all-res'}
                style={[styles.chip, filterResult === r && styles.chipActive]}
                onPress={() => setFilterResult(r)}
              >
                <Text style={[styles.chipText, filterResult === r && styles.chipTextActive]}>
                  {r || 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading && <ActivityIndicator color="#7C3AED" style={{ marginTop: 30 }} />}
        {!loading && filtered.length === 0 && (
          <Text style={styles.empty}>No hands match the current filter.</Text>
        )}
        {filtered.map((h) => (
          <SwipeableRow
            key={h.id}
            actions={[
              { label: 'Delete', color: '#ef4444', onPress: () => handleDelete(h) },
            ]}
          >
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                h.session && setSelectedHand({ sessionId: h.session.id, handId: h.id })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cards}>{h.hero_cards || '??'}</Text>
                {h.hero_position && <Text style={styles.position}>{h.hero_position}</Text>}
                {h.pot_result_cents != null && (
                  <Text style={[styles.result, { color: profitColor(h.pot_result_cents) }]}>
                    {formatMoney(h.pot_result_cents)}
                  </Text>
                )}
              </View>
              {h.session && (
                <Text style={styles.sessionMeta}>
                  {h.session.date}{h.session.stakes ? ` · ${h.session.stakes}` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </SwipeableRow>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openSessionPicker}>
        <Text style={styles.fabText}>+ Add Hand</Text>
      </TouchableOpacity>

      <Modal visible={showSessionPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Session</Text>
              <TouchableOpacity onPress={() => setShowSessionPicker(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>
            {loadingSessions ? (
              <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
            ) : sessions.length === 0 ? (
              <Text style={styles.modalEmpty}>No sessions yet. Create a session first.</Text>
            ) : (
              <ScrollView style={styles.modalList}>
                {sessions.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setShowSessionPicker(false);
                      setNewHandSessionId(s.id);
                    }}
                  >
                    <Text style={styles.modalItemDate}>{s.date}</Text>
                    <Text style={styles.modalItemMeta}>
                      {[s.stakes, s.location].filter(Boolean).join(' · ') || 'No details'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 16, paddingBottom: 80 },
  filters: { marginBottom: 16, gap: 8 },
  resultFilter: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#d1d5db', marginRight: 6, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cards: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  position: {
    fontSize: 12, color: '#7C3AED', backgroundColor: '#ede9fe',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontWeight: '600',
  },
  result: { fontSize: 14, fontWeight: '700' },
  sessionMeta: { color: '#9ca3af', fontSize: 12, marginTop: 6 },
  fab: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#7C3AED', borderRadius: 12, padding: 16,
    alignItems: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%', paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { color: '#7C3AED', fontSize: 15, fontWeight: '600' },
  modalEmpty: { color: '#9ca3af', textAlign: 'center', marginTop: 30, fontSize: 14 },
  modalList: { paddingHorizontal: 20 },
  modalItem: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalItemDate: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modalItemMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
