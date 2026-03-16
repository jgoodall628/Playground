export function formatMoney(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  return cents < 0 ? `-$${dollars}` : `$${dollars}`;
}

export function profitColor(cents: number): string {
  if (cents > 0) return '#16a34a';
  if (cents < 0) return '#dc2626';
  return '#6b7280';
}

export function parseDuration(text: string): number | undefined {
  const hours = text.match(/(\d+)\s*h/i);
  const mins = text.match(/(\d+)\s*m/i);
  const h = hours ? parseInt(hours[1], 10) : 0;
  const m = mins ? parseInt(mins[1], 10) : 0;
  const total = h * 60 + m;
  return total > 0 ? total : undefined;
}

export function formatDuration(minutes?: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
