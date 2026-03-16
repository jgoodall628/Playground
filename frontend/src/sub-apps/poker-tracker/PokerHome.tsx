import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import SessionList from './SessionList';
import AllHandsList from './AllHandsList';
import StatsScreen from './StatsScreen';

type Tab = 'sessions' | 'hands' | 'stats';

interface Props {
  slug: string;
}

export default function PokerHome({ slug: _ }: Props) {
  const [tab, setTab] = useState<Tab>('sessions');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Poker Tracker</Text>
      </View>

      <View style={styles.content}>
        {tab === 'sessions' && <SessionList />}
        {tab === 'hands' && <AllHandsList />}
        {tab === 'stats' && <StatsScreen />}
      </View>

      <View style={styles.tabBar}>
        {(['sessions', 'hands', 'stats'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#ede9fe', backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#7C3AED' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderTopWidth: 2, borderTopColor: 'transparent',
  },
  tabActive: { borderTopColor: '#7C3AED' },
  tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  tabTextActive: { color: '#7C3AED', fontWeight: '700' },
});
