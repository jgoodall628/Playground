import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  useHandForm,
  BIG_BLIND, SMALL_BLIND,
  PREFLOP_ORDER, POSTFLOP_ORDER,
  fmt, actionOrderFor,
} from './useHandForm';
import * as api from './api';

jest.mock('./api', () => ({ createHand: jest.fn() }));

const mockCreateHand = api.createHand as jest.Mock;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_ID = 1;

/** Render the hook and optionally set hero position before returning. */
function setup(heroPos = '') {
  const onSaved = jest.fn();
  const hook = renderHook(() => useHandForm(SESSION_ID, onSaved));
  if (heroPos) act(() => { hook.result.current.setHeroPosition(heroPos); });
  return { ...hook, onSaved };
}

/** Render and advance straight to the actions step. */
function setupActions(heroPos = 'BTN', startPotStr = '') {
  const result = setup(heroPos);
  act(() => {
    if (startPotStr) result.result.current.setStartingPotStr(startPotStr);
    result.result.current.startHand();
  });
  return result;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

// ── fmt helper ──────────────────────────────────────────────────────────────

describe('fmt', () => {
  it('formats 0 as 0.0bb', () => expect(fmt(0)).toBe('0.0bb'));
  it('formats 100 (1bb) as 1.0bb', () => expect(fmt(BIG_BLIND)).toBe('1.0bb'));
  it('formats 150 (1.5bb) as 1.5bb', () => expect(fmt(BIG_BLIND + SMALL_BLIND)).toBe('1.5bb'));
  it('formats 10000 (100bb) as 100.0bb', () => expect(fmt(10000)).toBe('100.0bb'));
});

// ── actionOrderFor helper ────────────────────────────────────────────────────

describe('actionOrderFor', () => {
  it('returns PREFLOP_ORDER for preflop', () => expect(actionOrderFor('preflop')).toBe(PREFLOP_ORDER));
  it('returns POSTFLOP_ORDER for flop', () => expect(actionOrderFor('flop')).toBe(POSTFLOP_ORDER));
  it('returns POSTFLOP_ORDER for turn', () => expect(actionOrderFor('turn')).toBe(POSTFLOP_ORDER));
  it('returns POSTFLOP_ORDER for river', () => expect(actionOrderFor('river')).toBe(POSTFLOP_ORDER));
});

// ── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts on the setup step', () => {
    const { result } = setup();
    expect(result.current.step).toBe('setup');
  });

  it('defaults effective stack to 100bb', () => {
    const { result } = setup();
    expect(result.current.stackStr).toBe('100');
  });

  it('starts with no cards', () => {
    const { result } = setup();
    expect(result.current.card1).toBe('');
    expect(result.current.card2).toBe('');
  });

  it('starts with no hero position', () => {
    const { result } = setup();
    expect(result.current.heroPosition).toBe('');
  });

  it('starts with no actions', () => {
    const { result } = setup();
    expect(result.current.actions).toHaveLength(0);
  });

  it('starts with pot at 0', () => {
    const { result } = setup();
    expect(result.current.potCents).toBe(0);
  });
});

// ── startHand ────────────────────────────────────────────────────────────────

describe('startHand', () => {
  it('transitions to the actions step', () => {
    const { result } = setup();
    act(() => { result.current.startHand(); });
    expect(result.current.step).toBe('actions');
  });

  it('defaults pot to 1.5bb (SB + BB) when no starting pot given', () => {
    const { result } = setup();
    act(() => { result.current.startHand(); });
    expect(result.current.potCents).toBe(BIG_BLIND + SMALL_BLIND);
  });

  it('uses custom starting pot when provided', () => {
    const { result } = setup();
    act(() => { result.current.setStartingPotStr('3'); });
    act(() => { result.current.startHand(); });
    expect(result.current.potCents).toBe(300); // $3.00 = 300 units
  });

  it('sets lastBetCents to BIG_BLIND (BB has posted)', () => {
    const { result } = setup();
    act(() => { result.current.startHand(); });
    expect(result.current.lastBetCents).toBe(BIG_BLIND);
  });

  it('sets currentActor to UTG (first in preflop order)', () => {
    const { result } = setup();
    act(() => { result.current.startHand(); });
    expect(result.current.currentActor).toBe('UTG');
  });

  it('clears any previously folded positions', () => {
    const { result } = setup('BTN');
    act(() => { result.current.startHand(); });
    // fold UTG, then restart
    act(() => { result.current.skipAction(); }); // UTG folds
    act(() => { result.current.setStep('setup'); });
    act(() => { result.current.startHand(); });
    expect(result.current.foldedPositions).toHaveLength(0);
  });
});

// ── skipAutoAction logic ─────────────────────────────────────────────────────

describe('skipAutoAction', () => {
  it('is "fold" when there is a current bet (non-BB player preflop)', () => {
    const { result } = setupActions('BTN'); // UTG to act, BB posted so lastBetCents = 100
    expect(result.current.skipAutoAction).toBe('fold');
  });

  it('is "check" when there is no current bet (post-flop)', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); }); // move to flop, resets lastBetCents to 0
    expect(result.current.skipAutoAction).toBe('check');
  });

  it('is "check" for BB preflop when no raise (lastBetCents == BIG_BLIND)', () => {
    // Advance actor to BB position (index 6 in PREFLOP_ORDER)
    const { result } = setupActions('BTN');
    // cycle through UTG, LJ, HJ, CO, BTN, SB all calling/folding to get to BB
    // skip everyone until we reach BB
    const stepsToSB = PREFLOP_ORDER.indexOf('SB'); // 5
    for (let i = 0; i < stepsToSB; i++) {
      act(() => { result.current.skipAction(); }); // each folds
    }
    act(() => { result.current.skipAction(); }); // SB folds
    // Now BB should be current actor
    expect(result.current.currentActor).toBe('BB');
    // lastBetCents is still BIG_BLIND (no raise), so BB gets check option
    expect(result.current.skipAutoAction).toBe('check');
  });

  it('is "fold" for BB preflop when there has been a raise', () => {
    const { result } = setupActions('UTG');
    // UTG raises to 3bb instead of skipping
    act(() => { result.current.setPendingActionType('raise'); });
    act(() => { result.current.handleAmountStr('3'); });
    act(() => { result.current.addPendingAction(); }); // UTG raises 3bb
    // skip to BB
    const stepsToLJ = PREFLOP_ORDER.indexOf('LJ');
    for (let i = 0; i < PREFLOP_ORDER.indexOf('SB') - stepsToLJ; i++) {
      act(() => { result.current.skipAction(); });
    }
    act(() => { result.current.skipAction(); }); // SB
    // BB faces a raise (lastBetCents = 300 > BIG_BLIND)
    expect(result.current.currentActor).toBe('BB');
    expect(result.current.skipAutoAction).toBe('fold');
  });
});

// ── skipAction ───────────────────────────────────────────────────────────────

describe('skipAction', () => {
  it('records an auto-fold when there is a current bet', () => {
    const { result } = setupActions('BTN'); // lastBetCents = 100, UTG to act
    act(() => { result.current.skipAction(); });
    expect(result.current.actions).toHaveLength(1);
    expect(result.current.actions[0].action_type).toBe('fold');
    expect(result.current.actions[0].actor).toBe('villain');
    expect(result.current.actions[0].villain_position).toBe('UTG');
  });

  it('records an auto-check when there is no current bet', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); }); // flop, lastBetCents = 0
    act(() => { result.current.skipAction(); }); // SB to act on flop
    expect(result.current.actions[0].action_type).toBe('check');
  });

  it('adds folded actor to foldedPositions', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.skipAction(); }); // UTG folds
    expect(result.current.foldedPositions).toContain('UTG');
  });

  it('does not add to foldedPositions when checking', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); }); // flop
    act(() => { result.current.skipAction(); });
    expect(result.current.foldedPositions).toHaveLength(0);
  });

  it('does not add to the pot', () => {
    const { result } = setupActions('BTN');
    const potBefore = result.current.potCents;
    act(() => { result.current.skipAction(); }); // UTG folds
    expect(result.current.potCents).toBe(potBefore);
  });

  it('advances to the next actor', () => {
    const { result } = setupActions('BTN');
    expect(result.current.currentActor).toBe('UTG');
    act(() => { result.current.skipAction(); });
    expect(result.current.currentActor).toBe('LJ');
  });

  it('resets pendingActionType and pendingAmountStr', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.setPendingActionType('bet'); });
    act(() => { result.current.handleAmountStr('2'); });
    act(() => { result.current.skipAction(); });
    expect(result.current.pendingActionType).toBe('');
    expect(result.current.pendingAmountStr).toBe('');
  });

  it('marks hero action correctly when it is hero turn', () => {
    const { result } = setupActions('UTG'); // hero is UTG, UTG acts first
    act(() => { result.current.skipAction(); }); // hero UTG folds
    expect(result.current.actions[0].actor).toBe('hero');
    expect(result.current.actions[0].villain_position).toBe('');
  });
});

// ── addPendingAction ─────────────────────────────────────────────────────────

describe('addPendingAction', () => {
  it('alerts and does nothing when no action type selected', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.addPendingAction(); });
    expect(Alert.alert).toHaveBeenCalledWith('Select an action type');
    expect(result.current.actions).toHaveLength(0);
  });

  it('alerts when bet is selected but no amount entered', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.setPendingActionType('bet'); });
    act(() => { result.current.addPendingAction(); });
    expect(Alert.alert).toHaveBeenCalledWith('Enter a bet amount');
    expect(result.current.actions).toHaveLength(0);
  });

  it('alerts when raise is selected but no amount entered', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.setPendingActionType('raise'); });
    act(() => { result.current.addPendingAction(); });
    expect(Alert.alert).toHaveBeenCalledWith('Enter a bet amount');
  });

  it('alerts when call is selected but no amount entered', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.setPendingActionType('call'); });
    act(() => { result.current.addPendingAction(); });
    expect(Alert.alert).toHaveBeenCalledWith('Enter a bet amount');
  });

  describe('fold', () => {
    it('records the fold action', () => {
      const { result } = setupActions('BTN');
      act(() => { result.current.setPendingActionType('fold'); });
      act(() => { result.current.addPendingAction(); });
      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].action_type).toBe('fold');
    });

    it('adds the actor to foldedPositions', () => {
      const { result } = setupActions('BTN');
      act(() => { result.current.setPendingActionType('fold'); });
      act(() => { result.current.addPendingAction(); });
      expect(result.current.foldedPositions).toContain('UTG');
    });

    it('does not change the pot', () => {
      const { result } = setupActions('BTN');
      const potBefore = result.current.potCents;
      act(() => { result.current.setPendingActionType('fold'); });
      act(() => { result.current.addPendingAction(); });
      expect(result.current.potCents).toBe(potBefore);
    });
  });

  describe('check', () => {
    it('records the check without changing the pot', () => {
      const { result } = setupActions('BTN');
      act(() => { result.current.advanceStreet(); }); // flop, no bet
      const potBefore = result.current.potCents;
      act(() => { result.current.setPendingActionType('check'); });
      act(() => { result.current.addPendingAction(); });
      expect(result.current.actions[0].action_type).toBe('check');
      expect(result.current.potCents).toBe(potBefore);
    });
  });

  describe('bet', () => {
    it('adds the bet amount to the pot', () => {
      const { result } = setupActions('BTN');
      act(() => { result.current.advanceStreet(); }); // flop
      const potBefore = result.current.potCents;
      act(() => { result.current.setPendingActionType('bet'); });
      act(() => { result.current.handleAmountStr('3'); }); // 3bb = 300 units
      act(() => { result.current.addPendingAction(); });
      expect(result.current.potCents).toBe(potBefore + 300);
    });

    it('updates lastBetCents', () => {
      const { result } = setupActions('BTN');
      act(() => { result.current.advanceStreet(); }); // flop
      act(() => { result.current.setPendingActionType('bet'); });
      act(() => { result.current.handleAmountStr('3'); });
      act(() => { result.current.addPendingAction(); });
      expect(result.current.lastBetCents).toBe(300);
    });

    it('tracks heroInvestedCents when hero bets', () => {
      const { result } = setupActions('SB'); // SB acts first on flop (postflop)
      act(() => { result.current.advanceStreet(); }); // flop, SB first
      act(() => { result.current.setPendingActionType('bet'); });
      act(() => { result.current.handleAmountStr('2'); });
      act(() => { result.current.addPendingAction(); }); // hero SB bets 2bb
      expect(result.current.remainingStack).toBe(10000 - 200); // 100bb - 2bb
    });

    it('does not change heroInvestedCents for villain bet', () => {
      const { result } = setupActions('BTN');
      act(() => { result.current.advanceStreet(); }); // flop, SB acts first (not hero)
      act(() => { result.current.setPendingActionType('bet'); });
      act(() => { result.current.handleAmountStr('2'); });
      act(() => { result.current.addPendingAction(); }); // villain SB bets
      // hero BTN stack should be unchanged (only BB contributed to starting pot)
      expect(result.current.remainingStack).toBe(10000);
    });
  });

  describe('raise', () => {
    it('updates lastBetCents with raise amount', () => {
      const { result } = setupActions('UTG');
      act(() => { result.current.setPendingActionType('raise'); });
      act(() => { result.current.handleAmountStr('3'); }); // 3bb raise
      act(() => { result.current.addPendingAction(); });
      expect(result.current.lastBetCents).toBe(300);
    });
  });

  describe('call', () => {
    it('adds call amount to pot but does not update lastBetCents', () => {
      const { result } = setupActions('BTN');
      const potBefore = result.current.potCents;
      act(() => { result.current.setPendingActionType('call'); });
      act(() => { result.current.handleAmountStr('1'); }); // call 1bb
      act(() => { result.current.addPendingAction(); });
      expect(result.current.potCents).toBe(potBefore + 100);
      // lastBetCents should still be BIG_BLIND (unchanged by a call)
      expect(result.current.lastBetCents).toBe(BIG_BLIND);
    });
  });

  it('resets pending state after recording', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.setPendingActionType('fold'); });
    act(() => { result.current.addPendingAction(); });
    expect(result.current.pendingActionType).toBe('');
    expect(result.current.pendingAmountStr).toBe('');
    expect(result.current.pendingAmountCents).toBeNull();
  });

  it('sets actor to hero when it is hero turn', () => {
    const { result } = setupActions('UTG'); // hero = UTG, first to act
    act(() => { result.current.setPendingActionType('fold'); });
    act(() => { result.current.addPendingAction(); });
    expect(result.current.actions[0].actor).toBe('hero');
    expect(result.current.actions[0].villain_position).toBe('');
  });

  it('sets actor to villain with position when not hero turn', () => {
    const { result } = setupActions('BTN'); // hero = BTN, UTG acts first
    act(() => { result.current.setPendingActionType('fold'); });
    act(() => { result.current.addPendingAction(); });
    expect(result.current.actions[0].actor).toBe('villain');
    expect(result.current.actions[0].villain_position).toBe('UTG');
  });

  it('records action with the current street', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); }); // move to flop
    act(() => { result.current.setPendingActionType('check'); });
    act(() => { result.current.addPendingAction(); });
    expect(result.current.actions[0].street).toBe('flop');
  });
});

// ── actor advancement ─────────────────────────────────────────────────────────

describe('actor advancement', () => {
  it('advances through positions in order', () => {
    const { result } = setupActions('BTN');
    expect(result.current.currentActor).toBe('UTG');
    act(() => { result.current.skipAction(); });
    expect(result.current.currentActor).toBe('LJ');
    act(() => { result.current.skipAction(); });
    expect(result.current.currentActor).toBe('HJ');
  });

  it('skips folded positions when advancing', () => {
    const { result } = setupActions('BTN');
    // UTG and LJ fold
    act(() => { result.current.skipAction(); }); // UTG folds → next is LJ
    act(() => { result.current.skipAction(); }); // LJ folds → next is HJ
    // Now manually fold HJ via addPendingAction, then next should be CO
    act(() => { result.current.setPendingActionType('fold'); });
    act(() => { result.current.addPendingAction(); }); // HJ folds
    expect(result.current.currentActor).toBe('CO');
  });

  it('wraps around the position order', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); }); // flop — lastBetCents = 0, all skips → check
    expect(result.current.currentActor).toBe(POSTFLOP_ORDER[0]); // 'SB'
    // Skip (check) all 7 players; after the 7th the index wraps back to SB
    for (let i = 0; i < POSTFLOP_ORDER.length; i++) {
      act(() => { result.current.skipAction(); });
    }
    expect(result.current.currentActor).toBe(POSTFLOP_ORDER[0]); // back to 'SB'
  });

  it('wraps around while skipping folded positions', () => {
    const { result } = setupActions('BTN');
    // Fold UTG, LJ, HJ (indices 0,1,2); CO, BTN, SB, BB are still in
    act(() => { result.current.skipAction(); }); // UTG folds → LJ
    act(() => { result.current.skipAction(); }); // LJ folds → HJ
    act(() => { result.current.skipAction(); }); // HJ folds → CO
    // Let CO, BTN, SB call (no fold), then BB checks
    act(() => { result.current.setPendingActionType('call'); result.current.handleAmountStr('1'); });
    act(() => { result.current.addPendingAction(); }); // CO calls → BTN
    act(() => { result.current.setPendingActionType('call'); result.current.handleAmountStr('1'); });
    act(() => { result.current.addPendingAction(); }); // BTN calls → SB
    act(() => { result.current.setPendingActionType('call'); result.current.handleAmountStr('1'); });
    act(() => { result.current.addPendingAction(); }); // SB calls → BB
    act(() => { result.current.skipAction(); }); // BB checks (bbPreflopOption) → wraps to UTG, skip UTG/LJ/HJ → CO
    expect(result.current.currentActor).toBe('CO');
  });
});

// ── advanceStreet ─────────────────────────────────────────────────────────────

describe('advanceStreet', () => {
  it('advances from preflop to flop', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); });
    expect(result.current.currentStreet).toBe('flop');
  });

  it('advances through all streets in order', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); });
    expect(result.current.currentStreet).toBe('flop');
    act(() => { result.current.advanceStreet(); });
    expect(result.current.currentStreet).toBe('turn');
    act(() => { result.current.advanceStreet(); });
    expect(result.current.currentStreet).toBe('river');
  });

  it('transitions to result step from river', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.advanceStreet(); }); // flop
    act(() => { result.current.advanceStreet(); }); // turn
    act(() => { result.current.advanceStreet(); }); // river
    act(() => { result.current.advanceStreet(); }); // result
    expect(result.current.step).toBe('result');
  });

  it('resets lastBetCents to 0', () => {
    const { result } = setupActions('BTN');
    expect(result.current.lastBetCents).toBe(BIG_BLIND);
    act(() => { result.current.advanceStreet(); });
    expect(result.current.lastBetCents).toBe(0);
  });

  it('resets currentActorIdx to 0 (SB acts first post-flop)', () => {
    const { result } = setupActions('BTN');
    // advance past UTG
    act(() => { result.current.skipAction(); });
    expect(result.current.currentActor).toBe('LJ');
    act(() => { result.current.advanceStreet(); }); // flop
    // post-flop order is POSTFLOP_ORDER, index 0 = 'SB'
    expect(result.current.currentActor).toBe(POSTFLOP_ORDER[0]);
  });

  it('clears pendingActionType and pendingAmountStr', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.setPendingActionType('bet'); });
    act(() => { result.current.handleAmountStr('2'); });
    act(() => { result.current.advanceStreet(); });
    expect(result.current.pendingActionType).toBe('');
    expect(result.current.pendingAmountStr).toBe('');
  });

  it('preserves foldedPositions across streets', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.skipAction(); }); // UTG folds
    act(() => { result.current.advanceStreet(); });
    expect(result.current.foldedPositions).toContain('UTG');
  });
});

// ── amount input ──────────────────────────────────────────────────────────────

describe('amount input', () => {
  it('handleAmountStr updates pendingAmountStr', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.handleAmountStr('2.5'); });
    expect(result.current.pendingAmountStr).toBe('2.5');
  });

  it('pendingAmountCents is derived from pendingAmountStr', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.handleAmountStr('3'); });
    expect(result.current.pendingAmountCents).toBe(300);
  });

  it('pendingAmountCents is null when pendingAmountStr is empty', () => {
    const { result } = setupActions('BTN');
    expect(result.current.pendingAmountCents).toBeNull();
  });

  it('handleSizingSelect sets pendingAmountStr to formatted bb value', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.handleSizingSelect(300); }); // 3bb
    expect(result.current.pendingAmountStr).toBe('3.00');
    expect(result.current.pendingAmountCents).toBe(300);
  });

  it('needsAmount is true for bet, raise, call', () => {
    const { result } = setupActions('BTN');
    for (const t of ['bet', 'raise', 'call'] as const) {
      act(() => { result.current.setPendingActionType(t); });
      expect(result.current.needsAmount).toBe(true);
    }
  });

  it('needsAmount is false for fold and check', () => {
    const { result } = setupActions('BTN');
    for (const t of ['fold', 'check'] as const) {
      act(() => { result.current.setPendingActionType(t); });
      expect(result.current.needsAmount).toBe(false);
    }
  });
});

// ── pot editing ───────────────────────────────────────────────────────────────

describe('pot editing', () => {
  it('startPotEdit sets editingPot to true and populates potEditStr', () => {
    const { result } = setupActions('BTN'); // pot = 150 (1.5bb)
    act(() => { result.current.startPotEdit(); });
    expect(result.current.editingPot).toBe(true);
    expect(result.current.potEditStr).toBe('1.50');
  });

  it('confirmPotEdit updates potCents and clears editingPot', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.startPotEdit(); });
    // setPotEditStr and confirmPotEdit must be separate acts so confirmPotEdit
    // reads the already-committed potEditStr value (React batches within one act)
    act(() => { result.current.setPotEditStr('5'); });
    act(() => { result.current.confirmPotEdit(); });
    expect(result.current.potCents).toBe(500);
    expect(result.current.editingPot).toBe(false);
  });

  it('confirmPotEdit ignores invalid input', () => {
    const { result } = setupActions('BTN');
    const potBefore = result.current.potCents;
    act(() => { result.current.startPotEdit(); });
    act(() => {
      result.current.setPotEditStr('abc');
      result.current.confirmPotEdit();
    });
    expect(result.current.potCents).toBe(potBefore);
    expect(result.current.editingPot).toBe(false);
  });
});

// ── undoLastAction ────────────────────────────────────────────────────────────

describe('undoLastAction', () => {
  it('removes the last action from the log', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.skipAction(); }); // UTG folds
    act(() => { result.current.skipAction(); }); // LJ folds
    expect(result.current.actions).toHaveLength(2);
    act(() => { result.current.undoLastAction(); });
    expect(result.current.actions).toHaveLength(1);
    expect(result.current.actions[0].villain_position).toBe('UTG');
  });

  it('does nothing when there are no actions', () => {
    const { result } = setupActions('BTN');
    act(() => { result.current.undoLastAction(); });
    expect(result.current.actions).toHaveLength(0);
  });
});

// ── remainingStack ────────────────────────────────────────────────────────────

describe('remainingStack', () => {
  it('equals stackCents initially (no investment)', () => {
    const { result } = setupActions('BTN');
    expect(result.current.remainingStack).toBe(10000); // 100bb
  });

  it('decreases as hero invests', () => {
    const { result } = setupActions('SB'); // hero = SB, acts first on flop
    act(() => { result.current.advanceStreet(); }); // flop
    act(() => { result.current.setPendingActionType('bet'); });
    act(() => { result.current.handleAmountStr('5'); }); // 5bb
    act(() => { result.current.addPendingAction(); });
    expect(result.current.remainingStack).toBe(10000 - 500); // 95bb
  });

  it('does not go below zero', () => {
    // hero = SB so they act first on the flop; use a tiny stack
    const { result } = setup('SB');
    act(() => { result.current.setStackStr('1'); }); // 1bb stack
    act(() => { result.current.startHand(); });
    act(() => { result.current.advanceStreet(); }); // flop, SB acts first
    act(() => { result.current.setPendingActionType('bet'); });
    act(() => { result.current.handleAmountStr('5'); }); // bet 5bb (more than 1bb stack)
    act(() => { result.current.addPendingAction(); }); // hero SB bets
    expect(result.current.remainingStack).toBe(0);
  });
});

// ── submit ────────────────────────────────────────────────────────────────────

describe('submit', () => {
  it('calls createHand with correct session id and data', async () => {
    mockCreateHand.mockResolvedValue({});
    const { result, onSaved } = setup('BTN');
    act(() => {
      result.current.setCard1('As');
      result.current.setCard2('Kh');
      result.current.setResultStr('50');
    });

    await act(async () => { await result.current.submit(); });

    expect(mockCreateHand).toHaveBeenCalledWith(SESSION_ID, expect.objectContaining({
      hero_cards: 'As Kh',
      hero_position: 'BTN',
      effective_stack_cents: 10000, // 100bb
      pot_result_cents: 5000,       // 50bb won
    }));
  });

  it('calls onSaved after successful submission', async () => {
    mockCreateHand.mockResolvedValue({});
    const { result, onSaved } = setup('BTN');
    act(() => { result.current.setResultStr('10'); });
    await act(async () => { await result.current.submit(); });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows an alert on API error', async () => {
    mockCreateHand.mockRejectedValue(new Error('Server error'));
    const { result } = setup('BTN');
    act(() => { result.current.setResultStr('10'); });
    await act(async () => { await result.current.submit(); });
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Server error');
  });

  it('sets saving to true during submission, false after', async () => {
    let resolveFn!: () => void;
    mockCreateHand.mockReturnValue(new Promise<void>(r => { resolveFn = r; }));
    const { result } = setup('BTN');

    act(() => { result.current.setResultStr('10'); });
    act(() => { result.current.submit(); }); // do not await yet
    expect(result.current.saving).toBe(true);

    await act(async () => { resolveFn(); });
    expect(result.current.saving).toBe(false);
  });

  it('serialises actions correctly', async () => {
    mockCreateHand.mockResolvedValue({});
    const { result } = setup('BTN');
    act(() => { result.current.startHand(); });
    act(() => { result.current.setPendingActionType('fold'); });
    act(() => { result.current.addPendingAction(); }); // UTG folds
    act(() => { result.current.setResultStr('0'); });

    await act(async () => { await result.current.submit(); });

    const payload = mockCreateHand.mock.calls[0][1];
    expect(payload.poker_actions_attributes[0]).toMatchObject({
      street: 'preflop',
      actor: 'villain',
      villain_position: 'UTG',
      action_type: 'fold',
      sequence: 1,
    });
  });

  it('marks result as negative when resultPositive is false', async () => {
    mockCreateHand.mockResolvedValue({});
    const { result } = setup('BTN');
    act(() => {
      result.current.setResultStr('20');
      result.current.setResultPositive(false);
    });
    await act(async () => { await result.current.submit(); });
    expect(mockCreateHand).toHaveBeenCalledWith(SESSION_ID, expect.objectContaining({
      pot_result_cents: -2000,
    }));
  });
});
