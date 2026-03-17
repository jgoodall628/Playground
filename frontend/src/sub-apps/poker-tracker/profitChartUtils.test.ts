import { filterCutoff, buildChartData, Filter } from './profitChartUtils';

// Fixed reference date for all tests: 2026-03-17
const NOW = new Date('2026-03-17T00:00:00Z');

// ── filterCutoff ──────────────────────────────────────────────────────────────

describe('filterCutoff', () => {
  it('returns empty string for "all"', () => {
    expect(filterCutoff('all', NOW)).toBe('');
  });

  it('returns date one year ago for "year"', () => {
    expect(filterCutoff('year', NOW)).toBe('2025-03-17');
  });

  it('returns date one month ago for "month"', () => {
    expect(filterCutoff('month', NOW)).toBe('2026-02-17');
  });
});

// ── buildChartData ────────────────────────────────────────────────────────────

const RAW = [
  { date: '2024-01-01', profit_cents: 100 },
  { date: '2025-06-01', profit_cents: 200 },
  { date: '2026-01-15', profit_cents: -50 },
  { date: '2026-03-10', profit_cents: 300 },
];

describe('buildChartData', () => {
  describe('filter: all', () => {
    it('includes all data points', () => {
      const result = buildChartData(RAW, 'all', NOW);
      expect(result).toHaveLength(4);
    });

    it('accumulates cumulative profit correctly', () => {
      const result = buildChartData(RAW, 'all', NOW);
      expect(result.map((d) => d.value)).toEqual([100, 300, 250, 550]);
    });

    it('preserves dates', () => {
      const result = buildChartData(RAW, 'all', NOW);
      expect(result[0].date).toBe('2024-01-01');
    });
  });

  describe('filter: year', () => {
    it('excludes data older than one year', () => {
      const result = buildChartData(RAW, 'year', NOW);
      // cutoff = 2025-03-17, so 2024-01-01 is excluded
      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2025-06-01');
    });

    it('accumulates only from filtered data', () => {
      const result = buildChartData(RAW, 'year', NOW);
      expect(result.map((d) => d.value)).toEqual([200, 150, 450]);
    });
  });

  describe('filter: month', () => {
    it('only includes data from the last month', () => {
      const result = buildChartData(RAW, 'month', NOW);
      // cutoff = 2026-02-17, so only 2026-03-10 qualifies
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-03-10');
    });

    it('cumulative starts fresh from filtered data', () => {
      const result = buildChartData(RAW, 'month', NOW);
      expect(result[0].value).toBe(300);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when no data matches the filter', () => {
      const result = buildChartData([], 'all', NOW);
      expect(result).toHaveLength(0);
    });

    it('returns empty array when all data is outside the filtered range', () => {
      const old = [{ date: '2020-01-01', profit_cents: 500 }];
      expect(buildChartData(old, 'month', NOW)).toHaveLength(0);
    });

    it('handles a single data point', () => {
      const single = [{ date: '2026-03-15', profit_cents: 750 }];
      const result = buildChartData(single, 'all', NOW);
      expect(result).toEqual([{ date: '2026-03-15', value: 750 }]);
    });

    it('handles negative profits correctly', () => {
      const data = [
        { date: '2026-01-01', profit_cents: -200 },
        { date: '2026-02-01', profit_cents: -100 },
      ];
      const result = buildChartData(data, 'all', NOW);
      expect(result.map((d) => d.value)).toEqual([-200, -300]);
    });

    it('includes cutoff date itself (>= comparison)', () => {
      // cutoff for 'year' from 2026-03-17 is '2025-03-17'
      const data = [{ date: '2025-03-17', profit_cents: 100 }];
      const result = buildChartData(data, 'year', NOW);
      expect(result).toHaveLength(1);
    });
  });
});
