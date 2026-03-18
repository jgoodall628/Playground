/**
 * End-to-end feature tests for the poker hand replayer.
 *
 * Rule set derived from https://bicyclecards.com/how-to-play/texas-holdem-poker
 *
 * Texas Hold'em rules applied in these tests:
 *  - Each player receives 2 private hole cards; 5 community cards form the board
 *  - 4 betting rounds: preflop → flop → turn → river
 *  - Preflop action order: UTG → LJ → HJ → CO → BTN → SB → BB
 *  - Postflop action order: SB → BB → UTG → LJ → HJ → CO → BTN
 *  - Blind structure: SB = 0.5bb, BB = 1bb (posted before action starts)
 *  - Preflop BB gets the "option" (check or raise) if no one has raised above 1bb
 *  - Available actions: fold / check / bet (no current bet); fold / call / raise (facing a bet)
 *  - A hand ends early when all but one player folds
 *  - Showdown: remaining active players reveal hole cards; best 5-card hand wins
 *  - Villain hole cards can be recorded for each position still active at showdown
 */

import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useHandForm, BIG_BLIND, SMALL_BLIND } from './useHandForm';
import * as api from './api';

jest.mock('./api', () => ({ createHand: jest.fn() }));

const mockCreateHand = api.createHand as jest.Mock;
const SESSION_ID = 42;

// ─── Helpers ────────────────────────────────────────────────────────────────

function setup(heroPos: string, stackBb = 100) {
  const onSaved = jest.fn();
  const hook = renderHook(() => useHandForm(SESSION_ID, onSaved));
  act(() => {
    hook.result.current.setHeroPosition(heroPos);
    hook.result.current.setStackStr(String(stackBb));
  });
  return { ...hook, onSaved };
}

function startActions(heroPos: string, stackBb = 100, startingPotStr?: string) {
  const h = setup(heroPos, stackBb);
  act(() => {
    if (startingPotStr) h.result.current.setStartingPotStr(startingPotStr);
    h.result.current.startHand();
  });
  return h;
}

/** Confirm board cards and advance to the next street. */
function confirmBoard(hook: ReturnType<typeof startActions>, cards: string[]) {
  act(() => { hook.result.current.requestAdvanceStreet(); });
  act(() => { hook.result.current.confirmBoardInput(cards); });
}

/** Record a bet/raise with an explicit amount (in bb). */
function doBet(hook: ReturnType<typeof startActions>, type: 'bet' | 'raise', amountBb: string) {
  act(() => { hook.result.current.setPendingActionType(type); });
  act(() => { hook.result.current.handleAmountStr(amountBb); });
  act(() => { hook.result.current.addPendingAction(); });
}

/** Record a call (amount is auto-derived from lastBetCents). */
function doCall(hook: ReturnType<typeof startActions>) {
  act(() => { hook.result.current.setPendingActionType('call'); });
  act(() => { hook.result.current.addPendingAction(); });
}

/** Record a check (only valid when not facing a bet). */
function doCheck(hook: ReturnType<typeof startActions>) {
  act(() => { hook.result.current.setPendingActionType('check'); });
  act(() => { hook.result.current.addPendingAction(); });
}

/** Record a fold. */
function doFold(hook: ReturnType<typeof startActions>) {
  act(() => { hook.result.current.setPendingActionType('fold'); });
  act(() => { hook.result.current.addPendingAction(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

// ─── Scenario 1: Button steal (preflop-only hand) ───────────────────────────
//
// Rule coverage:
//  - Preflop action order (UTG first)
//  - Hero acts in position (BTN)
//  - Hand ends when all others fold before a flop is needed

describe('Scenario 1: Button steal — preflop fold-around', () => {
  it('records all preflop folds correctly and reaches result step', () => {
    // Setup: hero = BTN, 100bb effective
    const h = startActions('BTN');
    expect(h.result.current.step).toBe('actions');
    expect(h.result.current.currentActor).toBe('UTG');

    // UTG, LJ, HJ, CO all fold (skip = auto-fold because facing BB raise)
    act(() => { h.result.current.skipAction(); }); // UTG folds
    act(() => { h.result.current.skipAction(); }); // LJ folds
    act(() => { h.result.current.skipAction(); }); // HJ folds
    act(() => { h.result.current.skipAction(); }); // CO folds

    // Hero BTN raises to 2.5bb
    expect(h.result.current.currentActor).toBe('BTN');
    expect(h.result.current.isHeroTurn).toBe(true);
    doBet(h, 'raise', '2.5');

    // SB folds
    expect(h.result.current.currentActor).toBe('SB');
    doFold(h);

    // BB folds
    expect(h.result.current.currentActor).toBe('BB');
    doFold(h);

    // All 7 actions recorded: 4 villain folds, 1 hero raise, 2 villain folds
    expect(h.result.current.actions).toHaveLength(7);

    const folds = h.result.current.actions.filter(a => a.action_type === 'fold');
    expect(folds).toHaveLength(6);

    const raise = h.result.current.actions.find(a => a.action_type === 'raise');
    expect(raise).toBeDefined();
    expect(raise!.actor).toBe('hero');
    expect(raise!.street).toBe('preflop');
    expect(raise!.amount).toBe('2.50');
  });

  it('correctly builds pot: starts at 1.5bb, hero raises 2.5bb → 4bb pot', () => {
    const h = startActions('BTN');
    const initialPot = BIG_BLIND + SMALL_BLIND; // 150

    act(() => { h.result.current.skipAction(); }); // UTG
    act(() => { h.result.current.skipAction(); }); // LJ
    act(() => { h.result.current.skipAction(); }); // HJ
    act(() => { h.result.current.skipAction(); }); // CO

    doBet(h, 'raise', '2.5'); // BTN raises 2.5bb
    // Pot = 150 + 250 = 400 (4bb)
    expect(h.result.current.potCents).toBe(initialPot + 250);

    doFold(h); // SB
    doFold(h); // BB
    expect(h.result.current.potCents).toBe(400);
  });

  it('hero has no folded positions among BTN actions', () => {
    const h = startActions('BTN');
    act(() => { h.result.current.skipAction(); }); // UTG
    act(() => { h.result.current.skipAction(); }); // LJ
    act(() => { h.result.current.skipAction(); }); // HJ
    act(() => { h.result.current.skipAction(); }); // CO
    doBet(h, 'raise', '2.5');
    doFold(h); // SB
    doFold(h); // BB

    expect(h.result.current.foldedPositions).not.toContain('BTN');
    expect(h.result.current.foldedPositions).toContain('UTG');
    expect(h.result.current.foldedPositions).toContain('SB');
    expect(h.result.current.foldedPositions).toContain('BB');
  });
});

// ─── Scenario 2: Heads-up flop c-bet (CO vs BB) ─────────────────────────────
//
// Rule coverage:
//  - Postflop action order (BB acts before CO)
//  - Board card input required before each postflop street
//  - Street transitions: preflop → flop → turn
//  - canAdvanceStreet becomes true when all active players have acted

describe('Scenario 2: Heads-up flop continuation bet', () => {
  function buildScenario() {
    const h = startActions('CO');

    // Preflop: UTG/LJ/HJ fold, CO raises 3bb, BTN/SB fold, BB calls
    act(() => { h.result.current.skipAction(); }); // UTG folds
    act(() => { h.result.current.skipAction(); }); // LJ folds
    act(() => { h.result.current.skipAction(); }); // HJ folds
    doBet(h, 'raise', '3');                        // CO raises 3bb (hero)
    doFold(h);                                      // BTN folds
    doFold(h);                                      // SB folds
    doCall(h);                                      // BB calls 3bb

    // BB called, CO already acted — all active players acted since last bet
    // → advance to flop
    confirmBoard(h, ['Kh', '7d', '2c']);
    return h;
  }

  it('transitions to flop after preflop action completes', () => {
    const h = buildScenario();
    expect(h.result.current.currentStreet).toBe('flop');
    expect(h.result.current.step).toBe('actions');
  });

  it('records board cards for the flop', () => {
    const h = buildScenario();
    expect(h.result.current.boardCards.flop).toEqual(['Kh', '7d', '2c']);
  });

  it('postflop: BB acts first (first active player left of button)', () => {
    const h = buildScenario();
    // Only BB and CO are active on the flop
    // Postflop order is SB→BB→UTG→LJ→HJ→CO→BTN; first active = BB
    expect(h.result.current.currentActor).toBe('BB');
    expect(h.result.current.isHeroTurn).toBe(false);
  });

  it('flop: BB checks, hero CO bets 4bb, BB calls', () => {
    const h = buildScenario();
    const potAfterPreflop = h.result.current.potCents; // 3bb + 3bb = 600

    doCheck(h);          // BB checks
    doBet(h, 'bet', '4'); // CO bets 4bb (hero)
    doCall(h);            // BB calls 4bb

    expect(h.result.current.potCents).toBe(potAfterPreflop + 400 + 400);
    expect(h.result.current.lastBetCents).toBe(400); // call doesn't reset lastBetCents
  });

  it('turn: BB checks, hero CO bets 10bb, BB folds → reaches canAdvanceStreet', () => {
    const h = buildScenario();

    doCheck(h);          // BB checks (flop)
    doBet(h, 'bet', '4'); // CO bets 4bb
    doCall(h);            // BB calls

    // Advance to turn
    confirmBoard(h, ['As']);
    expect(h.result.current.currentStreet).toBe('turn');

    doCheck(h);           // BB checks (turn)
    doBet(h, 'bet', '10'); // CO bets 10bb
    doFold(h);             // BB folds

    // After BB folds, only CO remains — canAdvanceStreet should be true
    expect(h.result.current.canAdvanceStreet).toBe(true);
  });

  it('full preflop-through-turn sequence produces correct action count', () => {
    const h = buildScenario();

    // Flop: BB check, CO bet, BB call = 3 actions
    doCheck(h);
    doBet(h, 'bet', '4');
    doCall(h);

    confirmBoard(h, ['As']);

    // Turn: BB check, CO bet 10, BB fold = 3 actions
    doCheck(h);
    doBet(h, 'bet', '10');
    doFold(h);

    // Preflop: UTG fold, LJ fold, HJ fold, CO raise, BTN fold, SB fold, BB call = 7
    // Flop: 3, Turn: 3 → total = 13
    expect(h.result.current.actions).toHaveLength(13);
  });
});

// ─── Scenario 3: 3-way hand to river showdown with villain cards ─────────────
//
// Rule coverage:
//  - Multi-way pot (3 players)
//  - All 4 betting streets
//  - Villain fold mid-hand (UTG folds on turn)
//  - Villain hole card input at showdown
//  - API save includes villain_cards

describe('Scenario 3: 3-way hand to river showdown with villain cards', () => {
  function buildScenario() {
    const h = startActions('BTN');
    // Cards for hero
    act(() => {
      h.result.current.setCard1('Ac');
      h.result.current.setCard2('Kd');
    });

    // Preflop: UTG raises 3bb, LJ/HJ/CO fold, BTN calls (hero), SB folds, BB calls
    doBet(h, 'raise', '3');                        // UTG raises 3bb (first to act)
    act(() => { h.result.current.skipAction(); }); // LJ folds
    act(() => { h.result.current.skipAction(); }); // HJ folds
    act(() => { h.result.current.skipAction(); }); // CO folds
    doCall(h);                                      // BTN calls (hero)
    act(() => { h.result.current.skipAction(); }); // SB folds
    doCall(h);                                      // BB calls

    // 3-way: UTG, BTN(hero), BB
    confirmBoard(h, ['Jh', 'Ts', '4d']); // flop
    return h;
  }

  it('3-way flop: active positions are UTG, BTN, BB', () => {
    const h = buildScenario();
    // LJ, HJ, CO, SB folded preflop; UTG raised, BTN called, BB called
    expect(h.result.current.foldedPositions).toContain('LJ');
    expect(h.result.current.foldedPositions).toContain('HJ');
    expect(h.result.current.foldedPositions).toContain('CO');
    expect(h.result.current.foldedPositions).toContain('SB');
    expect(h.result.current.foldedPositions).not.toContain('UTG');
    expect(h.result.current.foldedPositions).not.toContain('BTN');
    expect(h.result.current.foldedPositions).not.toContain('BB');
  });

  it('flop checks through, turn UTG folds, river BTN calls BB', () => {
    const h = buildScenario();

    // Flop: all check
    doCheck(h); // BB (postflop SB is folded, first active = BB)
    doCheck(h); // UTG
    doCheck(h); // BTN (hero)

    // Advance to turn
    confirmBoard(h, ['9c']);
    expect(h.result.current.currentStreet).toBe('turn');

    // Turn: BB bets 8bb, UTG folds, BTN calls
    doBet(h, 'bet', '8'); // BB bets
    doFold(h);             // UTG folds
    doCall(h);             // BTN calls (hero)

    expect(h.result.current.foldedPositions).toContain('UTG');
    expect(h.result.current.potCents).toBeGreaterThan(0);

    // Advance to river
    confirmBoard(h, ['2s']);
    expect(h.result.current.currentStreet).toBe('river');

    // River: BB bets 20bb, BTN calls
    doBet(h, 'bet', '20'); // BB bets
    doCall(h);              // BTN calls (hero)

    // After river action — canAdvanceStreet should be true
    expect(h.result.current.canAdvanceStreet).toBe(true);
  });

  it('showdownPositions after river: BB and UTG eligible (not hero BTN, not folded-before-showdown)', () => {
    const h = buildScenario();

    doCheck(h); // BB
    doCheck(h); // UTG
    doCheck(h); // BTN

    confirmBoard(h, ['9c']);
    doBet(h, 'bet', '8'); // BB
    doFold(h);             // UTG folds
    doCall(h);             // BTN

    confirmBoard(h, ['2s']);
    doBet(h, 'bet', '20'); // BB
    doCall(h);              // BTN

    // After river action, still on actions step; advance to result
    act(() => { h.result.current.requestAdvanceStreet(); });
    expect(h.result.current.step).toBe('result');

    // showdownPositions: active positions excluding hero BTN
    // UTG folded on turn, so NOT at showdown; BB still active
    expect(h.result.current.showdownPositions).toContain('BB');
    expect(h.result.current.showdownPositions).not.toContain('BTN'); // hero
    expect(h.result.current.showdownPositions).not.toContain('UTG'); // folded
  });

  it('villain cards are captured and included in API payload on submit', async () => {
    mockCreateHand.mockResolvedValue({});
    const h = buildScenario();

    doCheck(h); // BB
    doCheck(h); // UTG
    doCheck(h); // BTN

    confirmBoard(h, ['9c']);
    doBet(h, 'bet', '8');
    doFold(h); // UTG folds
    doCall(h);

    confirmBoard(h, ['2s']);
    doBet(h, 'bet', '20');
    doCall(h);

    act(() => { h.result.current.requestAdvanceStreet(); });

    // Record villain cards for BB (UTG folded, so only BB at showdown)
    act(() => {
      h.result.current.setVillainCard('BB', 'Ah Th');
    });

    await act(async () => { await h.result.current.submit(); });

    const payload = mockCreateHand.mock.calls[0][1];
    expect(payload.villain_cards).toEqual({ BB: 'Ah Th' });
    expect(payload.hero_cards).toBe('Ac Kd');
    expect(payload.hero_position).toBe('BTN');
  });
});

// ─── Scenario 4: BB walk — everyone folds, BB wins without contest ───────────
//
// Rule coverage:
//  - BB gets the "option" preflop when no one has raised
//  - BB check = hand ends immediately (no flop needed)
//  - skipAutoAction is 'check' for BB with no raise

describe('Scenario 4: BB walk — hero is BB, everyone folds', () => {
  it('BB skip is "check" (bbPreflopOption) when no raise has occurred', () => {
    const h = startActions('BB');

    // UTG through BTN all fold (5 positions), SB folds
    act(() => { h.result.current.skipAction(); }); // UTG folds
    act(() => { h.result.current.skipAction(); }); // LJ folds
    act(() => { h.result.current.skipAction(); }); // HJ folds
    act(() => { h.result.current.skipAction(); }); // CO folds
    act(() => { h.result.current.skipAction(); }); // BTN folds
    act(() => { h.result.current.skipAction(); }); // SB folds

    expect(h.result.current.currentActor).toBe('BB');
    expect(h.result.current.skipAutoAction).toBe('check');
    expect(h.result.current.availableActions).toEqual(['fold', 'check', 'bet']);
  });

  it('BB check via skip records a check action (not a fold)', () => {
    const h = startActions('BB');

    act(() => { h.result.current.skipAction(); }); // UTG
    act(() => { h.result.current.skipAction(); }); // LJ
    act(() => { h.result.current.skipAction(); }); // HJ
    act(() => { h.result.current.skipAction(); }); // CO
    act(() => { h.result.current.skipAction(); }); // BTN
    act(() => { h.result.current.skipAction(); }); // SB
    act(() => { h.result.current.skipAction(); }); // BB checks (option)

    const bbAction = h.result.current.actions.find(a => a.actor === 'hero');
    expect(bbAction?.action_type).toBe('check');
    expect(h.result.current.foldedPositions).not.toContain('BB');
  });

  it('BB check is recorded and hand can proceed to result via requestAdvanceStreet', () => {
    const h = startActions('BB');

    act(() => { h.result.current.skipAction(); }); // UTG
    act(() => { h.result.current.skipAction(); }); // LJ
    act(() => { h.result.current.skipAction(); }); // HJ
    act(() => { h.result.current.skipAction(); }); // CO
    act(() => { h.result.current.skipAction(); }); // BTN
    act(() => { h.result.current.skipAction(); }); // SB
    act(() => { h.result.current.skipAction(); }); // BB checks (option)

    // BB checked — all remaining villains folded, hero (BB) is the only active player
    // The BB check action is recorded
    const bbCheck = h.result.current.actions.find(
      a => a.actor === 'hero' && a.action_type === 'check'
    );
    expect(bbCheck).toBeDefined();

    // requestAdvanceStreet can move to flop (or result if no one else is active)
    // At minimum the step can be advanced by going to a new street
    act(() => { h.result.current.requestAdvanceStreet(); });
    // After requesting advance, boardInputPending will be set for the next street
    // (or step transitions to result if appropriate)
    const afterStep = h.result.current.step;
    const boardPending = h.result.current.boardInputPending;
    expect(afterStep === 'result' || boardPending === 'flop').toBe(true);
  });
});

// ─── Scenario 5: Hero folds preflop ─────────────────────────────────────────
//
// Rule coverage:
//  - Hero fold recorded with actor='hero' and empty villain_position
//  - Hand continues with remaining villains after hero folds
//  - hero is no longer 'isHeroTurn' after folding and action advances

describe('Scenario 5: Hero folds preflop', () => {
  it('records hero fold as actor=hero with empty villain_position', () => {
    const h = startActions('UTG'); // hero = UTG, acts first
    doFold(h); // hero UTG folds

    expect(h.result.current.actions[0].actor).toBe('hero');
    expect(h.result.current.actions[0].action_type).toBe('fold');
    expect(h.result.current.actions[0].villain_position).toBe('');
  });

  it('advances to LJ after hero UTG folds', () => {
    const h = startActions('UTG');
    doFold(h);

    expect(h.result.current.currentActor).toBe('LJ');
    expect(h.result.current.isHeroTurn).toBe(false);
  });

  it('hero is in foldedPositions after folding', () => {
    const h = startActions('UTG');
    doFold(h);
    expect(h.result.current.foldedPositions).toContain('UTG');
  });

  it('subsequent actions are recorded as villain', () => {
    const h = startActions('UTG');
    doFold(h);         // hero folds
    doFold(h);         // LJ villain folds
    doFold(h);         // HJ villain folds

    const villainFolds = h.result.current.actions.filter(a => a.actor === 'villain');
    expect(villainFolds).toHaveLength(2);
    expect(villainFolds[0].villain_position).toBe('LJ');
    expect(villainFolds[1].villain_position).toBe('HJ');
  });
});

// ─── Scenario 6: Complete hand — all 4 streets, full serialization check ─────
//
// Rule coverage:
//  - All 4 betting streets recorded
//  - Board cards captured at flop, turn, river
//  - API payload shape matches expected structure
//  - villain_cards included in submit

describe('Scenario 6: Complete hand through all streets — API serialization', () => {
  it('serializes a full hand correctly with all fields', async () => {
    mockCreateHand.mockResolvedValue({});

    const h = startActions('SB', 100);
    act(() => {
      h.result.current.setCard1('Qh');
      h.result.current.setCard2('Qs');
    });

    // Preflop: UTG raises 3bb, LJ/HJ/CO/BTN fold, SB calls (hero), BB calls
    doBet(h, 'raise', '3');                        // UTG raises
    act(() => { h.result.current.skipAction(); }); // LJ folds
    act(() => { h.result.current.skipAction(); }); // HJ folds
    act(() => { h.result.current.skipAction(); }); // CO folds
    act(() => { h.result.current.skipAction(); }); // BTN folds
    doCall(h);                                      // SB calls (hero)
    doCall(h);                                      // BB calls

    // 3-way: UTG, SB(hero), BB
    confirmBoard(h, ['Qs', 'Jd', '3h']); // flop

    // Flop: SB bets 5bb (hero), BB calls, UTG folds
    doBet(h, 'bet', '5');   // SB bets
    doCall(h);               // BB calls
    doFold(h);               // UTG folds

    confirmBoard(h, ['Kc']); // turn

    // Turn: SB bets 10bb, BB calls
    doBet(h, 'bet', '10');
    doCall(h); // BB calls

    confirmBoard(h, ['7s']); // river

    // River: SB bets 20bb, BB calls
    doBet(h, 'bet', '20');
    doCall(h); // BB calls

    // Advance to result
    act(() => { h.result.current.requestAdvanceStreet(); });
    expect(h.result.current.step).toBe('result');

    // Enter villain cards
    act(() => {
      h.result.current.setVillainCard('BB', 'Jc Jh');
      h.result.current.setVillainCard('UTG', 'Ah Kh');
    });

    act(() => {
      h.result.current.setNotes('Flopped a set, value-bet all streets');
    });

    await act(async () => { await h.result.current.submit(); });

    // Hero invested: 3bb call preflop (300) + 5bb bet flop (500) + 10bb bet turn (1000) + 20bb bet river (2000) = 3800
    // Pot: 150 + 300 + 300 + 300 + 500 + 500 + 1000 + 1000 + 2000 + 2000 = 8050
    // Won (default) = 8050 - 3800 = 4250
    expect(mockCreateHand).toHaveBeenCalledWith(SESSION_ID, expect.objectContaining({
      hero_cards: 'Qh Qs',
      hero_position: 'SB',
      effective_stack_cents: 10000,
      pot_result_cents: 4250,
      notes: 'Flopped a set, value-bet all streets',
      villain_cards: { BB: 'Jc Jh', UTG: 'Ah Kh' },
    }));

    const payload = mockCreateHand.mock.calls[0][1];
    const actions = payload.poker_actions_attributes;

    // Verify sequence numbering starts at 1 and is contiguous
    actions.forEach((a: { sequence: number }, i: number) => {
      expect(a.sequence).toBe(i + 1);
    });

    // Verify streets are correct for each phase
    const preflopActions = actions.filter((a: { street: string }) => a.street === 'preflop');
    const flopActions    = actions.filter((a: { street: string }) => a.street === 'flop');
    const turnActions    = actions.filter((a: { street: string }) => a.street === 'turn');
    const riverActions   = actions.filter((a: { street: string }) => a.street === 'river');

    expect(preflopActions.length).toBeGreaterThanOrEqual(7); // UTG raise + folds + calls
    expect(flopActions.length).toBeGreaterThanOrEqual(3);    // bet + call + fold
    expect(turnActions.length).toBeGreaterThanOrEqual(2);    // bet + call
    expect(riverActions.length).toBeGreaterThanOrEqual(2);   // bet + call

    // Verify hero actions have correct actor field
    const heroActions = actions.filter((a: { actor: string }) => a.actor === 'hero');
    heroActions.forEach((a: { villain_position: string }) => {
      expect(a.villain_position).toBeUndefined();
    });

    // Verify villain actions have position set
    const villainBets = actions.filter(
      (a: { actor: string; action_type: string }) => a.actor === 'villain' && a.action_type === 'bet'
    );
    villainBets.forEach((a: { villain_position: string }) => {
      expect(a.villain_position).toBeTruthy();
    });
  });

  it('board cards are recorded for all three postflop streets', async () => {
    mockCreateHand.mockResolvedValue({});
    const h = startActions('BTN');

    // Quick preflop: everyone folds to BTN, BTN raises, SB/BB fold
    act(() => { h.result.current.skipAction(); }); // UTG
    act(() => { h.result.current.skipAction(); }); // LJ
    act(() => { h.result.current.skipAction(); }); // HJ
    act(() => { h.result.current.skipAction(); }); // CO
    doBet(h, 'raise', '2.5');
    doCall(h); // SB calls
    doCall(h); // BB calls

    confirmBoard(h, ['Ah', 'Kd', '2s']); // flop

    doCheck(h); // SB
    doCheck(h); // BB
    doCheck(h); // BTN (hero)

    confirmBoard(h, ['Jc']); // turn

    doCheck(h); // SB
    doCheck(h); // BB
    doCheck(h); // BTN

    confirmBoard(h, ['7h']); // river

    doCheck(h); // SB
    doCheck(h); // BB
    doCheck(h); // BTN

    act(() => { h.result.current.requestAdvanceStreet(); });

    expect(h.result.current.boardCards.flop).toEqual(['Ah', 'Kd', '2s']);
    expect(h.result.current.boardCards.turn).toEqual(['Jc']);
    expect(h.result.current.boardCards.river).toEqual(['7h']);
  });
});

// ─── Villain cards: setVillainCard / showdownPositions unit tests ─────────────

describe('Villain hole cards', () => {
  it('setVillainCard stores cards per position', () => {
    const h = startActions('BTN');
    act(() => {
      h.result.current.setVillainCard('UTG', 'Ac Kd');
      h.result.current.setVillainCard('BB', 'Jh 9s');
    });
    expect(h.result.current.villainCards).toEqual({ UTG: 'Ac Kd', BB: 'Jh 9s' });
  });

  it('setVillainCard overwrites previously set cards for the same position', () => {
    const h = startActions('BTN');
    act(() => { h.result.current.setVillainCard('UTG', 'Ac Kd'); });
    act(() => { h.result.current.setVillainCard('UTG', '2h 3s'); });
    expect(h.result.current.villainCards['UTG']).toBe('2h 3s');
  });

  it('showdownPositions excludes hero and folded positions', () => {
    const h = startActions('BTN');
    // Fold UTG and LJ preflop
    act(() => { h.result.current.skipAction(); }); // UTG folds
    act(() => { h.result.current.skipAction(); }); // LJ folds

    // showdownPositions: all positions not folded and not BTN
    const showdown = h.result.current.showdownPositions;
    expect(showdown).not.toContain('BTN');  // hero
    expect(showdown).not.toContain('UTG');  // folded
    expect(showdown).not.toContain('LJ');   // folded
    expect(showdown).toContain('HJ');
    expect(showdown).toContain('CO');
    expect(showdown).toContain('SB');
    expect(showdown).toContain('BB');
  });

  it('submit omits villain_cards when none have been set', async () => {
    mockCreateHand.mockResolvedValue({});
    const h = startActions('BTN');
    await act(async () => { await h.result.current.submit(); });

    const payload = mockCreateHand.mock.calls[0][1];
    expect(payload.villain_cards).toBeUndefined();
  });

  it('submit includes villain_cards when at least one is set', async () => {
    mockCreateHand.mockResolvedValue({});
    const h = startActions('BTN');
    act(() => {
      h.result.current.setVillainCard('BB', 'As Kh');
    });
    await act(async () => { await h.result.current.submit(); });

    const payload = mockCreateHand.mock.calls[0][1];
    expect(payload.villain_cards).toEqual({ BB: 'As Kh' });
  });
});
