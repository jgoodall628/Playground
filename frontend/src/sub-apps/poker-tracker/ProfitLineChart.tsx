import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatMoney, profitColor } from './utils';
import { buildChartData, Filter, RawDataPoint } from './profitChartUtils';

const CHART_HEIGHT = 120;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Last Year', value: 'year' },
  { label: 'Last Month', value: 'month' },
];

interface Props {
  data: RawDataPoint[];
}

export default function ProfitLineChart({ data }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [chartWidth, setChartWidth] = useState(280);

  const chartData = buildChartData(data, filter);

  const filterBar = (
    <View style={styles.filterRow}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.value}
          onPress={() => setFilter(f.value)}
          style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
        >
          <Text style={[styles.filterLabel, filter === f.value && styles.filterLabelActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (chartData.length === 0) {
    return (
      <>
        {filterBar}
        <Text style={styles.empty}>No data for this period.</Text>
      </>
    );
  }

  // Compute min/max in a single pass — avoids intermediate array + spread
  let minVal = chartData[0].value;
  let maxVal = chartData[0].value;
  for (const d of chartData) {
    if (d.value < minVal) minVal = d.value;
    if (d.value > maxVal) maxVal = d.value;
  }
  const range = maxVal - minVal || 1;

  // Normalize a profit value to a y-coordinate within the chart
  const toY = (v: number) => CHART_HEIGHT - ((v - minVal) / range) * (CHART_HEIGHT - 8) - 4;

  const points = chartData.map((d, i) => ({
    x: chartData.length === 1 ? chartWidth / 2 : (i / (chartData.length - 1)) * chartWidth,
    y: toY(d.value),
    value: d.value,
  }));

  // Line segments drawn at midpoint and rotated around center
  const segments = points.slice(1).map((p, i) => {
    const prev = points[i];
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return { left: (prev.x + p.x) / 2 - length / 2, top: (prev.y + p.y) / 2 - 1, length, angle };
  });

  const lastValue = points[points.length - 1].value;
  const zeroY = minVal < 0 && maxVal > 0 ? toY(0) : null;

  return (
    <>
      {filterBar}
      <View
        style={styles.chart}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w !== chartWidth) setChartWidth(w);
        }}
      >
        {zeroY !== null && (
          <View style={[styles.zeroLine, { top: zeroY }]} />
        )}
        {segments.map((seg, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                left: seg.left,
                top: seg.top,
                width: seg.length,
                transform: [{ rotate: `${seg.angle}deg` }],
              },
            ]}
          />
        ))}
        {points.map((p, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { left: p.x - 3, top: p.y - 3, backgroundColor: profitColor(p.value) },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.lastValue, { color: profitColor(lastValue) }]}>
        {formatMoney(lastValue)}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterLabelActive: { color: '#fff' },
  empty: { color: '#9ca3af', fontSize: 14 },
  chart: { height: CHART_HEIGHT, width: '100%' },
  zeroLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#e5e7eb' },
  segment: { position: 'absolute', height: 2, backgroundColor: '#7C3AED' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  lastValue: { fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 6 },
});
