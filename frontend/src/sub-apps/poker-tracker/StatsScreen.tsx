import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { getStats, PokerStats } from './api';
import { formatMoney, profitColor } from './utils';

export default function StatsScreen() {
  const [stats, setStats] = useState<PokerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#7C3AED" />;
  if (!stats) return null;

  // Compute cumulative profit for chart
  let cumulative = 0;
  const chartData = stats.profit_by_date.map((d) => {
    cumulative += d.profit_cents;
    return { date: d.date, value: cumulative };
  });

  const maxAbs = Math.max(...chartData.map((d) => Math.abs(d.value)), 1);

  const positions = Object.entries(stats.win_rate_by_position);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Profit</Text>
          <Text style={[styles.summaryValue, { color: profitColor(stats.total_profit_cents) }]}>
            {formatMoney(stats.total_profit_cents)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Sessions</Text>
          <Text style={styles.summaryValue}>{stats.session_count}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg / Session</Text>
          <Text style={[styles.summaryValue, { color: profitColor(stats.avg_profit_per_session_cents) }]}>
            {formatMoney(stats.avg_profit_per_session_cents)}
          </Text>
        </View>
      </View>

      {/* Profit over time */}
      <Text style={styles.chartTitle}>Cumulative Profit Over Time</Text>
      {chartData.length === 0 ? (
        <Text style={styles.empty}>No session data yet.</Text>
      ) : (
        <View style={styles.chartContainer}>
          {chartData.map((d, i) => {
            const barFraction = Math.abs(d.value) / maxAbs;
            const isPositive = d.value >= 0;
            return (
              <View key={i} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{d.date.slice(5)}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${Math.round(barFraction * 100)}%`,
                        backgroundColor: isPositive ? '#16a34a' : '#dc2626',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barValue, { color: profitColor(d.value) }]}>
                  {formatMoney(d.value)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Win rate by position */}
      <Text style={styles.chartTitle}>Win Rate by Position</Text>
      {positions.length === 0 ? (
        <Text style={styles.empty}>No hand data yet.</Text>
      ) : (
        <View style={styles.chartContainer}>
          {positions.map(([pos, rate]) => (
            <View key={pos} style={styles.barRow}>
              <Text style={styles.barLabelFixed}>{pos}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.round(rate * 100)}%`,
                      backgroundColor: '#7C3AED',
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValueSmall}>{Math.round(rate * 100)}%</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  summaryLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  empty: { color: '#9ca3af', fontSize: 14, marginBottom: 20 },
  chartContainer: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 24,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 36, fontSize: 11, color: '#6b7280' },
  barLabelFixed: { width: 36, fontSize: 13, fontWeight: '600', color: '#374151' },
  barTrack: {
    flex: 1, height: 16, backgroundColor: '#f3f4f6', borderRadius: 8,
    marginHorizontal: 8, overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 8, minWidth: 2 },
  barValue: { width: 64, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  barValueSmall: { width: 36, fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'right' },
});
