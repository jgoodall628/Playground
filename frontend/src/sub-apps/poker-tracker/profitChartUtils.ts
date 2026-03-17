export type Filter = 'all' | 'year' | 'month';

export interface RawDataPoint {
  date: string;
  profit_cents: number;
}

export interface ChartPoint {
  date: string;
  value: number;
}

/** Returns the ISO date cutoff string for a filter ('' means no cutoff). */
export function filterCutoff(filter: Filter, now = new Date()): string {
  if (filter === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }
  if (filter === 'year') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }
  return '';
}

/** Filters raw data by cutoff date then accumulates cumulative profit. */
export function buildChartData(data: RawDataPoint[], filter: Filter, now?: Date): ChartPoint[] {
  const cutoff = filterCutoff(filter, now);
  const filtered = cutoff ? data.filter((d) => d.date >= cutoff) : data;
  let cumulative = 0;
  return filtered.map((d) => {
    cumulative += d.profit_cents;
    return { date: d.date, value: cumulative };
  });
}
