import { API_BASE_URL, API_WRITE_TOKEN } from '../../config';
import type {
  PokerSession,
  PokerHandSummary,
  PokerHand,
  PokerStats,
} from './constants';
export type {
  PokerSession,
  PokerHandSummary,
  PokerHand,
  PokerAction,
  PokerStats,
} from './constants';

const API_BASE = `${API_BASE_URL}/poker`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_WRITE_TOKEN) headers['Authorization'] = `Bearer ${API_WRITE_TOKEN}`;
  const response = await fetch(`${API_BASE}${path}`, {
    headers,
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
export const updateHand = (sessionId: number, handId: number, data: Partial<PokerHand>) =>
  request<PokerHand>(`/sessions/${sessionId}/hands/${handId}`, {
    method: 'PATCH',
    body: JSON.stringify({ poker_hand: data }),
  });
export const deleteHand = (sessionId: number, handId: number) =>
  request<void>(`/sessions/${sessionId}/hands/${handId}`, { method: 'DELETE' });

// Stats
export const getStats = () => request<PokerStats>('/stats');
