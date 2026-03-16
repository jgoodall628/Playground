import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { getAllHands, PokerHand } from './api';
import { formatMoney, profitColor } from './utils';
import HandDetail from './HandDetail';

const POSITIONS = ['BTN', 'CO', 'MP', 'UTG', 'SB', 'BB'];

export default function AllHandsList() {
  const [hands, setHands] = useState<PokerHand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPos, setFilterPos] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [selectedHand, setSelectedHand] = useState<{ sessionId: number; handId: number } | null>(null);

  useEffect(() => {
    getAllHands()
      .then(setHands)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, []);

  if (selectedHand) {
    return (
      <HandDetail
        sessionId={selectedHand.sessionId}
        handId={selectedHand.handId}
        onBack={() => setSelectedHand(null)}
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
          <TouchableOpacity
            key={h.id}
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 16 },
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
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cards: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  position: {
    fontSize: 12, color: '#7C3AED', backgroundColor: '#ede9fe',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontWeight: '600',
  },
  result: { fontSize: 14, fontWeight: '700' },
  sessionMeta: { color: '#9ca3af', fontSize: 12, marginTop: 6 },
});
