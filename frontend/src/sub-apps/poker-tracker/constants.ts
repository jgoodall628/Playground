// ─── Position / Street / Action constants ──────────────────────────────────

export const POSITIONS = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
export const ACTION_TYPES = ['fold', 'check', 'call', 'bet', 'raise'] as const;

export const PREFLOP_ORDER  = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const POSTFLOP_ORDER = ['SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO', 'BTN'];

// 1bb = 100 internal units (integer arithmetic denominated in BBs)
export const BIG_BLIND   = 100;
export const SMALL_BLIND = 50;

// ─── Hand form types ────────────────────────────────────────────────────────

export type Street     = typeof STREETS[number];
export type ActionType = typeof ACTION_TYPES[number];
export type WizardStep = 'setup' | 'actions' | 'result';

export interface ActionInput {
  street: string;
  actor: 'hero' | 'villain';
  villain_position: string;
  action_type: ActionType;
  amount: string;
}

export interface BoardCards {
  flop: string[];
  turn: string[];
  river: string[];
}

// ─── API types ──────────────────────────────────────────────────────────────

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
  villain_cards?: Record<string, string>;
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

// ─── Helpers ────────────────────────────────────────────────────────────────

export function fmt(units: number) {
  return `${(units / 100).toFixed(1)}bb`;
}

export function actionOrderFor(street: Street): string[] {
  return street === 'preflop' ? PREFLOP_ORDER : POSTFLOP_ORDER;
}
