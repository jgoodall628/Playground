import { useState } from 'react';
import { Alert } from 'react-native';
import { createHand } from './api';

// ─── Constants ─────────────────────────────────────────────────────────────────

export const POSITIONS = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;
export const ACTION_TYPES = ['fold', 'check', 'call', 'bet', 'raise'] as const;

export const PREFLOP_ORDER  = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const POSTFLOP_ORDER = ['SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO', 'BTN'];

// 1bb = 100 internal units (integer arithmetic denominated in BBs)
export const BIG_BLIND   = 100;
export const SMALL_BLIND = 50;

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function fmt(units: number) {
  return `${(units / 100).toFixed(1)}bb`;
}

export function actionOrderFor(street: Street): string[] {
  return street === 'preflop' ? PREFLOP_ORDER : POSTFLOP_ORDER;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useHandForm(sessionId: number, onSaved: () => void) {
  // ── Wizard step ──
  const [step, setStep] = useState<WizardStep>('setup');

  // ── Setup ──
  const [card1, setCard1] = useState('');
  const [card2, setCard2] = useState('');
  const [heroPosition, setHeroPosition] = useState('');
  const [stackStr, setStackStr] = useState('100');
  const [startingPotStr, setStartingPotStr] = useState('');

  // ── Actions ──
  const [currentStreet, setCurrentStreet] = useState<Street>('preflop');
  const [potCents, setPotCents] = useState(0);
  const [heroInvestedCents, setHeroInvestedCents] = useState(0);
  const [lastBetCents, setLastBetCents] = useState(0);
  const [actions, setActions] = useState<ActionInput[]>([]);
  const [currentActorIdx, setCurrentActorIdx] = useState(0);
  const [foldedPositions, setFoldedPositions] = useState<string[]>([]);
  const [pendingActionType, setPendingActionType] = useState<ActionType | ''>('');
  const [pendingAmountStr, setPendingAmountStr] = useState('');
  const [editingPot, setEditingPot] = useState(false);
  const [potEditStr, setPotEditStr] = useState('');

  // ── Board cards ──
  const [boardCards, setBoardCards] = useState<BoardCards>({ flop: [], turn: [], river: [] });
  // When non-null, we're waiting for the user to input board cards for this street
  const [boardInputPending, setBoardInputPending] = useState<Street | null>(null);

  // ── Action completion tracking ──
  // Tracks which positions have acted since the last bet/raise (or since street start)
  const [actedSinceLastBet, setActedSinceLastBet] = useState<string[]>([]);

  // ── Result ──
  const [resultStr, setResultStr] = useState('');
  const [resultPositive, setResultPositive] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Derived values ──
  const stackCents       = stackStr ? Math.round(parseFloat(stackStr) * 100) : 0;
  const remainingStack   = Math.max(0, stackCents - heroInvestedCents);
  const pendingAmountCents = pendingAmountStr ? Math.round(parseFloat(pendingAmountStr) * 100) : null;
  const needsAmount      = pendingActionType === 'bet' || pendingActionType === 'raise';
  const actorOrder       = actionOrderFor(currentStreet);
  const currentActor     = actorOrder[currentActorIdx] ?? '';
  const isHeroTurn       = currentActor === heroPosition;
  const bbPreflopOption  = currentStreet === 'preflop' && currentActor === 'BB' && lastBetCents <= BIG_BLIND;
  const skipAutoAction: ActionType = (lastBetCents === 0 || bbPreflopOption) ? 'check' : 'fold';
  const isFacingBet      = lastBetCents > 0 && !bbPreflopOption;
  const availableActions: ActionType[] = isFacingBet
    ? ['fold', 'call', 'raise']
    : ['fold', 'check', 'bet'];

  // Street is advanceable when all active players have acted since the last bet,
  // there's no pending action selected, and the BB preflop option hasn't been used yet.
  const activePositions = actorOrder.filter(p => !foldedPositions.includes(p));
  const allActed = activePositions.length === 0 ||
    activePositions.every(p => actedSinceLastBet.includes(p));
  const canAdvanceStreet = allActed && !bbPreflopOption && !pendingActionType;

  // ── Advance to next non-folded actor ──
  function advanceActor(folded: string[]) {
    const order = actionOrderFor(currentStreet);
    let next = (currentActorIdx + 1) % order.length;
    let tries = 0;
    while (folded.includes(order[next]) && tries < order.length) {
      next = (next + 1) % order.length;
      tries++;
    }
    setCurrentActorIdx(next);
  }

  // ── Shared action recorder (used by addPendingAction and skipAction) ──
  function recordAction(actionType: ActionType, amountCents: number | null) {
    const amountStr = amountCents !== null ? (amountCents / 100).toFixed(2) : '';

    const newAction: ActionInput = {
      street: currentStreet,
      actor: isHeroTurn ? 'hero' : 'villain',
      villain_position: isHeroTurn ? '' : currentActor,
      action_type: actionType,
      amount: amountStr,
    };

    setActions(prev => [...prev, newAction]);

    const newFolded = actionType === 'fold'
      ? [...foldedPositions, currentActor]
      : foldedPositions;
    if (actionType === 'fold') setFoldedPositions(newFolded);

    if (amountCents !== null) {
      setPotCents(p => p + amountCents);
      if (isHeroTurn) setHeroInvestedCents(h => h + amountCents);
      if (actionType === 'bet' || actionType === 'raise') setLastBetCents(amountCents);
    }

    // Update acted-since-last-bet tracking
    if (actionType === 'bet' || actionType === 'raise') {
      // Reset orbit — only the bettor has "acted" in this new orbit
      setActedSinceLastBet([currentActor]);
    } else {
      // fold / check / call — add current actor to acted set
      setActedSinceLastBet(prev => [...new Set([...prev, currentActor])]);
    }

    advanceActor(newFolded);
  }

  function resetPending() {
    setPendingActionType('');
    setPendingAmountStr('');
  }

  // ── Setup → Actions ──
  function startHand() {
    const initPot = startingPotStr
      ? Math.round(parseFloat(startingPotStr) * 100)
      : BIG_BLIND + SMALL_BLIND; // default 1.5bb
    setPotCents(initPot);
    setLastBetCents(BIG_BLIND); // BB has already posted
    setCurrentActorIdx(0);
    setFoldedPositions([]);
    // BB has effectively "bet" by posting, so mark BB as having acted
    setActedSinceLastBet(['BB']);
    setStep('actions');
  }

  // ── Add pending action (with validation) ──
  function addPendingAction() {
    if (!pendingActionType) { Alert.alert('Select an action type'); return; }
    let amountCents: number | null = null;
    if (pendingActionType === 'call') {
      amountCents = lastBetCents;
    } else if (needsAmount) {
      if (pendingAmountCents === null) { Alert.alert('Enter a bet amount'); return; }
      amountCents = pendingAmountCents;
    }
    recordAction(pendingActionType as ActionType, amountCents);
    resetPending();
  }

  // ── Skip (auto fold or check) ──
  function skipAction() {
    recordAction(skipAutoAction, null);
    resetPending();
  }

  // ── Advance to next street (internal — does not trigger board input) ──
  function advanceStreet(folded: string[] = foldedPositions) {
    const idx = STREETS.indexOf(currentStreet);
    if (idx >= STREETS.length - 1) { setStep('result'); return; }
    const nextStreet = STREETS[idx + 1];
    setCurrentStreet(nextStreet);
    // Start at first non-folded position for the new street
    const order = actionOrderFor(nextStreet);
    const firstActive = order.findIndex(p => !folded.includes(p));
    setCurrentActorIdx(firstActive >= 0 ? firstActive : 0);
    setLastBetCents(0);
    setActedSinceLastBet([]);
    resetPending();
  }

  // ── Request street advance (triggers board card input for flop/turn/river) ──
  function requestAdvanceStreet() {
    const idx = STREETS.indexOf(currentStreet);
    if (idx >= STREETS.length - 1) {
      // River → result: no board input needed
      setStep('result');
      return;
    }
    const nextStreet = STREETS[idx + 1];
    // All postflop streets need board card input
    setBoardInputPending(nextStreet);
  }

  // ── Confirm board card input ──
  function confirmBoardInput(cards: string[]) {
    if (!boardInputPending) return;
    setBoardCards(prev => ({ ...prev, [boardInputPending]: cards }));
    setBoardInputPending(null);
    advanceStreet();
  }

  // ── Amount input handling ──
  function handleAmountStr(val: string) {
    setPendingAmountStr(val);
  }

  function handleSizingSelect(cents: number) {
    setPendingAmountStr((cents / 100).toFixed(2));
  }

  // ── Pot editing ──
  function startPotEdit() {
    setPotEditStr((potCents / 100).toFixed(2));
    setEditingPot(true);
  }

  function confirmPotEdit() {
    const n = parseFloat(potEditStr);
    if (!isNaN(n)) setPotCents(Math.round(n * 100));
    setEditingPot(false);
  }

  // ── Undo last action ──
  function undoLastAction() {
    setActions(prev => prev.slice(0, -1));
  }

  // ── Submit ──
  async function submit() {
    setSaving(true);
    try {
      const rawResult = parseFloat(resultStr) * (resultPositive ? 1 : -1);
      await createHand(sessionId, {
        hero_cards: [card1, card2].filter(Boolean).join(' ') || undefined,
        hero_position: heroPosition || undefined,
        effective_stack_cents: stackStr ? Math.round(parseFloat(stackStr) * 100) : undefined,
        pot_result_cents: resultStr ? Math.round(rawResult * 100) : undefined,
        notes: notes || undefined,
        poker_actions_attributes: actions.map((a, i) => ({
          street: a.street,
          actor: a.actor,
          villain_position: a.actor === 'villain' ? a.villain_position : undefined,
          action_type: a.action_type,
          amount_cents: a.amount ? Math.round(parseFloat(a.amount) * 100) : undefined,
          sequence: i + 1,
        })),
      });
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    // Wizard
    step,
    setStep,

    // Setup
    card1, setCard1,
    card2, setCard2,
    heroPosition, setHeroPosition,
    stackStr, setStackStr,
    startingPotStr, setStartingPotStr,

    // Actions
    currentStreet,
    potCents,
    remainingStack,
    lastBetCents,
    actions,
    foldedPositions,
    pendingActionType, setPendingActionType,
    pendingAmountStr,
    pendingAmountCents,
    needsAmount,
    editingPot,
    potEditStr, setPotEditStr,
    actorOrder,
    currentActor,
    isHeroTurn,
    skipAutoAction,
    isFacingBet,
    availableActions,
    canAdvanceStreet,

    // Board cards
    boardCards,
    boardInputPending,

    // Result
    resultStr, setResultStr,
    resultPositive, setResultPositive,
    notes, setNotes,
    saving,

    // Handlers
    startHand,
    addPendingAction,
    skipAction,
    requestAdvanceStreet,
    confirmBoardInput,
    handleAmountStr,
    handleSizingSelect,
    startPotEdit,
    confirmPotEdit,
    undoLastAction,
    submit,
  };
}
