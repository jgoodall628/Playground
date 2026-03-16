const API_BASE = 'https://playground-api-dyu9.onrender.com/api/v1/poker';

export interface PokerSession {
  id: number;
  date: string;
  buy_in_cents: number;
  cash_out_cents: number;
  profit_cents: number;
  location?: string;
  game_type?: string;
  stakes?: string;
  duration_minutes?: number;
  hands?: PokerHandSummary[];
}

export interface PokerHandSummary {
  id: number;
  hero_cards?: string;
  hero_position?: string;
  pot_result_cents?: number;
}

export interface PokerHand {
  id: number;
  poker_session_id: number;
  hero_cards?: string;
  hero_position?: string;
  effective_stack_cents?: number;
  pot_result_cents?: number;
  notes?: string;
  actions?: PokerAction[];
  session?: { id: number; date: string; stakes?: string };
}

export interface PokerAction {
  id: number;
  street: string;
  actor: string;
  villain_position?: string;
  action_type: string;
  amount_cents?: number;
  sequence: number;
}

export interface PokerStats {
  total_profit_cents: number;
  session_count: number;
  avg_profit_per_session_cents: number;
  profit_by_date: { date: string; profit_cents: number }[];
  win_rate_by_position: Record<string, number>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.errors?.join(', ') || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

// Sessions
export const getSessions = () => request<PokerSession[]>('/sessions');
export const getSession = (id: number) => request<PokerSession>(`/sessions/${id}`);
export const createSession = (data: Partial<PokerSession>) =>
  request<PokerSession>('/sessions', { method: 'POST', body: JSON.stringify({ poker_session: data }) });
export const updateSession = (id: number, data: Partial<PokerSession>) =>
  request<PokerSession>(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ poker_session: data }) });
export const deleteSession = (id: number) => request<void>(`/sessions/${id}`, { method: 'DELETE' });

// Hands
export const getAllHands = () => request<PokerHand[]>('/hands');
export const getSessionHands = (sessionId: number) =>
  request<PokerHandSummary[]>(`/sessions/${sessionId}/hands`);
export const getHand = (sessionId: number, handId: number) =>
  request<PokerHand>(`/sessions/${sessionId}/hands/${handId}`);
export const createHand = (sessionId: number, data: Record<string, unknown>) =>
  request<PokerHandSummary>(`/sessions/${sessionId}/hands`, {
    method: 'POST',
    body: JSON.stringify({ poker_hand: data }),
  });
export const deleteHand = (sessionId: number, handId: number) =>
  request<void>(`/sessions/${sessionId}/hands/${handId}`, { method: 'DELETE' });

// Stats
export const getStats = () => request<PokerStats>('/stats');
