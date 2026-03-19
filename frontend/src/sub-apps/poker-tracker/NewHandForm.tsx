import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useHandForm } from './useHandForm';
import {
  POSITIONS, STREETS,
  fmt,
  type Street,
  type ActionType,
} from './constants';

const STREET_COLORS_MAP: Record<Street, string> = {
  preflop: '#7C3AED',
  flop: '#0ea5e9',
  turn: '#f59e0b',
  river: '#16a34a',
};

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_CHARS = ['s', 'h', 'd', 'c'];

interface Props {
  sessionId: number;
  onSaved: () => void;
  onCancel: () => void;
}

// ─── CardPicker ────────────────────────────────────────────────────────────────

function CardPicker({ card1, card2, onChange }: {
  card1: string; card2: string; onChange: (c1: string, c2: string) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<0 | 1>(card1 ? 1 : 0);
  const [pendingRank, setPendingRank] = useState<string | null>(null);

  const suitColor = (s: string) => (['♥', '♦'].includes(s) ? '#dc2626' : '#111827');

  const displayCard = (card: string) => {
    if (!card) return null;
    const rank = card.slice(0, -1);
    const suitIdx = SUIT_CHARS.indexOf(card.slice(-1));
    const suit = SUITS[suitIdx] ?? '';
    return { rank, suit, color: suitColor(suit) };
  };

  const selectSuit = (suitIdx: number) => {
    if (!pendingRank) return;
    const newCard = pendingRank + SUIT_CHARS[suitIdx];
    if (activeSlot === 0) { onChange(newCard, card2); setActiveSlot(1); }
    else { onChange(card1, newCard); }
    setPendingRank(null);
  };

  const activateSlot = (slot: 0 | 1) => { setActiveSlot(slot); setPendingRank(null); };
  const c1 = displayCard(card1);
  const c2 = displayCard(card2);

  return (
    <View style={cpStyles.container}>
      <Text style={cpStyles.label}>Hero Cards</Text>
      <View style={cpStyles.slots}>
        <TouchableOpacity style={[cpStyles.slot, activeSlot === 0 && cpStyles.slotActive]} onPress={() => activateSlot(0)}>
          {c1 ? <Text style={[cpStyles.cardText, { color: c1.color }]}>{c1.rank}{c1.suit}</Text>
               : <Text style={cpStyles.slotEmpty}>{activeSlot === 0 ? '?' : '–'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[cpStyles.slot, activeSlot === 1 && cpStyles.slotActive]} onPress={() => activateSlot(1)}>
          {c2 ? <Text style={[cpStyles.cardText, { color: c2.color }]}>{c2.rank}{c2.suit}</Text>
               : <Text style={cpStyles.slotEmpty}>{activeSlot === 1 ? '?' : '–'}</Text>}
        </TouchableOpacity>
      </View>
      <View style={cpStyles.rankGrid}>
        {RANKS.map((r) => (
          <TouchableOpacity key={r} style={[cpStyles.rankBtn, pendingRank === r && cpStyles.rankBtnActive]} onPress={() => setPendingRank(r)}>
            <Text style={[cpStyles.rankText, pendingRank === r && cpStyles.rankTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={cpStyles.suitRow}>
        {SUITS.map((s, i) => (
          <TouchableOpacity key={s} style={[cpStyles.suitBtn, !pendingRank && cpStyles.suitBtnDisabled]} onPress={() => selectSuit(i)} disabled={!pendingRank}>
            <Text style={[cpStyles.suitText, { color: suitColor(s) }, !pendingRank && cpStyles.suitTextDisabled]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const cpStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  slots: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  slot: { width: 60, height: 80, borderRadius: 8, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  slotActive: { borderColor: '#7C3AED' },
  slotEmpty: { fontSize: 24, color: '#d1d5db' },
  cardText: { fontSize: 22, fontWeight: '700' },
  rankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  rankBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  rankBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  rankText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  rankTextActive: { color: '#fff' },
  suitRow: { flexDirection: 'row', gap: 10 },
  suitBtn: { width: 52, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  suitBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  suitText: { fontSize: 22, fontWeight: '600' },
  suitTextDisabled: { opacity: 0.35 },
});

// ─── BoardCardPicker ────────────────────────────────────────────────────────────

function BoardCardPicker({ count, streetColor, onConfirm }: {
  count: 1 | 3; streetColor: string; onConfirm: (cards: string[]) => void;
}) {
  const [slots, setSlots] = useState<string[]>(Array(count).fill(''));
  const [activeSlot, setActiveSlot] = useState(0);
  const [pendingRank, setPendingRank] = useState<string | null>(null);

  const suitColor = (s: string) => (['♥', '♦'].includes(s) ? '#dc2626' : '#111827');

  const displayCard = (card: string) => {
    if (!card) return null;
    const rank = card.slice(0, -1);
    const suitIdx = SUIT_CHARS.indexOf(card.slice(-1));
    const suit = SUITS[suitIdx] ?? '';
    return { rank, suit, color: suitColor(suit) };
  };

  const selectSuit = (suitIdx: number) => {
    if (!pendingRank) return;
    const newCard = pendingRank + SUIT_CHARS[suitIdx];
    const newSlots = [...slots];
    newSlots[activeSlot] = newCard;
    setSlots(newSlots);
    // Advance to next empty slot
    const nextEmpty = newSlots.findIndex((s, i) => i > activeSlot && !s);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
    setPendingRank(null);
  };

  const allFilled = slots.every(s => s !== '');

  return (
    <View style={bcpStyles.container}>
      <View style={bcpStyles.slots}>
        {slots.map((card, i) => {
          const c = displayCard(card);
          return (
            <TouchableOpacity
              key={i}
              style={[bcpStyles.slot, activeSlot === i && { borderColor: streetColor }]}
              onPress={() => { setActiveSlot(i); setPendingRank(null); }}
            >
              {c
                ? <Text style={[bcpStyles.cardText, { color: c.color }]}>{c.rank}{c.suit}</Text>
                : <Text style={bcpStyles.slotEmpty}>{activeSlot === i ? '?' : '–'}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={cpStyles.rankGrid}>
        {RANKS.map((r) => (
          <TouchableOpacity key={r} style={[cpStyles.rankBtn, pendingRank === r && { backgroundColor: streetColor, borderColor: streetColor }]} onPress={() => setPendingRank(r)}>
            <Text style={[cpStyles.rankText, pendingRank === r && cpStyles.rankTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={cpStyles.suitRow}>
        {SUITS.map((s, i) => (
          <TouchableOpacity key={s} style={[cpStyles.suitBtn, !pendingRank && cpStyles.suitBtnDisabled]} onPress={() => selectSuit(i)} disabled={!pendingRank}>
            <Text style={[cpStyles.suitText, { color: suitColor(s) }, !pendingRank && cpStyles.suitTextDisabled]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, !allFilled && styles.primaryBtnDisabled, { backgroundColor: streetColor }]}
        onPress={() => allFilled && onConfirm(slots)}
        disabled={!allFilled}
      >
        <Text style={styles.primaryBtnText}>Deal Cards →</Text>
      </TouchableOpacity>
    </View>
  );
}

const bcpStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  slots: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  slot: { width: 56, height: 76, borderRadius: 8, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  slotEmpty: { fontSize: 22, color: '#d1d5db' },
  cardText: { fontSize: 20, fontWeight: '700' },
});

// ─── BetSizingButtons ──────────────────────────────────────────────────────────

function BetSizingButtons({ potCents, remainingStackCents, lastBetCents, selected, onSelect }: {
  potCents: number; remainingStackCents: number; lastBetCents: number;
  selected: number | null; onSelect: (cents: number) => void;
}) {
  // Min bet: 1bb if no current bet, otherwise 2× the current bet
  const BIG_BLIND = 100;
  const minBet = lastBetCents > 0 ? lastBetCents * 2 : BIG_BLIND;
  const sizings = [
    { label: 'Min',  cents: minBet },
    { label: '33%',  cents: Math.round(potCents * 0.33) },
    { label: '80%',  cents: Math.round(potCents * 0.80) },
    { label: '150%', cents: Math.round(potCents * 1.50) },
    { label: 'All In', cents: remainingStackCents },
  ];

  const validSizings = sizings.filter(({ cents }) => cents >= minBet);

  return (
    <View style={bsStyles.row}>
      {validSizings.map(({ label, cents }) => {
        const isActive = selected === cents;
        return (
          <TouchableOpacity key={label} style={[bsStyles.btn, isActive && bsStyles.btnActive]} onPress={() => onSelect(cents)}>
            <Text style={[bsStyles.btnLabel, isActive && bsStyles.btnLabelActive]}>{label}</Text>
            <Text style={[bsStyles.btnAmount, isActive && bsStyles.btnAmountActive]}>{fmt(cents)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const bsStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center' },
  btnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  btnLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
  btnLabelActive: { color: '#fff' },
  btnAmount: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  btnAmountActive: { color: '#ede9fe' },
});

// ─── Chips ─────────────────────────────────────────────────────────────────────

function Chips({ options, value, onChange, size = 'md' }: {
  options: string[]; value: string; onChange: (v: string) => void; size?: 'sm' | 'md';
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {options.map((opt) => (
        <TouchableOpacity key={opt} style={[chipStyles.chip, value === opt && chipStyles.active, size === 'sm' && chipStyles.sm]} onPress={() => onChange(opt)}>
          <Text style={[chipStyles.text, value === opt && chipStyles.textActive, size === 'sm' && chipStyles.smText]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', marginRight: 8, backgroundColor: '#fff' },
  active: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  text: { fontSize: 14, color: '#374151', fontWeight: '500' },
  textActive: { color: '#fff', fontWeight: '700' },
  sm: { paddingHorizontal: 10, paddingVertical: 5 },
  smText: { fontSize: 12 },
});

// ─── BoardDisplay ───────────────────────────────────────────────────────────────

function BoardDisplay({ boardCards, currentStreet }: {
  boardCards: { flop: string[]; turn: string[]; river: string[] };
  currentStreet: Street;
}) {
  const streetIdx = STREETS.indexOf(currentStreet);

  const allCards: string[] = [
    ...(streetIdx >= 1 ? boardCards.flop : []),
    ...(streetIdx >= 2 ? boardCards.turn : []),
    ...(streetIdx >= 3 ? boardCards.river : []),
  ];

  if (allCards.length === 0) return null;

  const _suitColor = (s: string) => (['♥', '♦'].includes(s) ? '#dc2626' : '#fff');

  const renderCard = (card: string, i: number) => {
    const rank = card.slice(0, -1);
    const suitIdx = SUIT_CHARS.indexOf(card.slice(-1));
    const suit = SUITS[suitIdx] ?? '';
    const isRed = ['♥', '♦'].includes(suit);
    return (
      <View key={i} style={bdStyles.card}>
        <Text style={[bdStyles.cardText, { color: isRed ? '#dc2626' : '#111827' }]}>{rank}{suit}</Text>
      </View>
    );
  };

  return (
    <View style={bdStyles.row}>
      {allCards.map((card, i) => renderCard(card, i))}
    </View>
  );
}

const bdStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginTop: 8 },
  card: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.9)', minWidth: 36, alignItems: 'center' },
  cardText: { fontSize: 14, fontWeight: '700' },
});

// ─── Main component ────────────────────────────────────────────────────────────

export default function NewHandForm({ sessionId, onSaved, onCancel }: Props) {
  const form = useHandForm(sessionId, onSaved);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: SETUP
  // ─────────────────────────────────────────────────────────────────────────────
  if (form.step === 'setup') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>New Hand</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <CardPicker card1={form.card1} card2={form.card2} onChange={(c1, c2) => { form.setCard1(c1); form.setCard2(c2); }} />

        <Text style={styles.label}>Hero Position</Text>
        <Chips options={POSITIONS} value={form.heroPosition} onChange={form.setHeroPosition} />

        <Text style={styles.label}>Effective Stack (bb)</Text>
        <TextInput style={styles.input} value={form.stackStr} onChangeText={form.setStackStr} placeholder="100" keyboardType="decimal-pad" />

        <Text style={styles.label}>Starting Pot (bb) — optional</Text>
        <TextInput style={styles.input} value={form.startingPotStr} onChangeText={form.setStartingPotStr} placeholder="1.5 (default: SB+BB)" keyboardType="decimal-pad" />

        <TouchableOpacity style={[styles.primaryBtn, !form.heroPosition && styles.primaryBtnDisabled]} onPress={form.startHand} disabled={!form.heroPosition}>
          <Text style={styles.primaryBtnText}>Start Hand →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  if (form.step === 'actions') {
    const streetColor = STREET_COLORS_MAP[form.currentStreet];
    const streetIdx   = STREETS.indexOf(form.currentStreet);
    const isLastStreet = streetIdx === STREETS.length - 1;
    const nextStreetName = !isLastStreet
      ? STREETS[streetIdx + 1].charAt(0).toUpperCase() + STREETS[streetIdx + 1].slice(1)
      : '';

    // ── Board card input screen ──
    if (form.boardInputPending !== null) {
      const targetStreet = form.boardInputPending;
      const targetColor  = STREET_COLORS_MAP[targetStreet];
      const cardCount    = targetStreet === 'flop' ? 3 : 1;

      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={[styles.streetHeader, { backgroundColor: targetColor }]}>
            <Text style={styles.streetLabel}>{targetStreet.toUpperCase()}</Text>
            <Text style={styles.potHeaderText}>Enter board cards</Text>
          </View>
          <BoardCardPicker
            count={cardCount as 1 | 3}
            streetColor={targetColor}
            onConfirm={form.confirmBoardInput}
          />
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Street header */}
        <View style={[styles.streetHeader, { backgroundColor: streetColor }]}>
          <View>
            <Text style={styles.streetLabel}>{form.currentStreet.toUpperCase()}</Text>
            <BoardDisplay boardCards={form.boardCards} currentStreet={form.currentStreet} />
          </View>
          {form.editingPot ? (
            <View style={styles.potEditRow}>
              <Text style={styles.potHeaderText}>Pot: </Text>
              <TextInput
                style={styles.potInput}
                value={form.potEditStr}
                onChangeText={form.setPotEditStr}
                onBlur={form.confirmPotEdit}
                onSubmitEditing={form.confirmPotEdit}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.potHeaderText}>bb</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={form.startPotEdit}>
              <Text style={styles.potHeaderText}>Pot: {fmt(form.potCents)} ✎</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Position order indicator */}
        <View style={styles.positionRow}>
          {form.actorOrder.map((pos) => {
            const isCurrent = pos === form.currentActor;
            const isFolded  = form.foldedPositions.includes(pos);
            const isHero    = pos === form.heroPosition;
            return (
              <View key={pos} style={[styles.posChip, isCurrent && { backgroundColor: streetColor, borderColor: streetColor }, isFolded && styles.posChipFolded]}>
                <Text style={[styles.posChipText, isCurrent && styles.posChipTextActive, isFolded && styles.posChipTextFolded]}>
                  {pos}{isHero ? '*' : ''}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Current actor banner */}
        <View style={[styles.actorBanner, form.isHeroTurn && { borderColor: streetColor }]}>
          <Text style={[styles.actorBannerText, form.isHeroTurn && { color: streetColor }]}>
            {form.isHeroTurn ? `You (${form.currentActor}) to act` : `${form.currentActor} to act`}
          </Text>
        </View>

        {/* Action type */}
        <Text style={styles.label}>Action</Text>
        <Chips options={form.availableActions} value={form.pendingActionType} onChange={(v) => {
          const action = v as ActionType;
          if (action === 'fold' || action === 'call' || action === 'check') {
            form.autoSubmitAction(action);
          } else {
            form.setPendingActionType(action);
          }
        }} />

        {/* Bet sizing */}
        {form.needsAmount && (
          <View style={styles.sizingBlock}>
            <BetSizingButtons
              potCents={form.potCents}
              remainingStackCents={form.remainingStack}
              lastBetCents={form.lastBetCents}
              selected={form.pendingAmountCents}
              onSelect={form.autoSubmitSizing}
            />
            <TextInput style={styles.input} value={form.pendingAmountStr} onChangeText={form.handleAmountStr} placeholder="or enter amount (bb)" keyboardType="decimal-pad" />
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionBtnRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={form.skipAction}>
            <Text style={styles.skipBtnText}>Skip ({form.skipAutoAction})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, styles.addActionBtn, !form.pendingActionType && styles.primaryBtnDisabled]} onPress={form.addPendingAction} disabled={!form.pendingActionType}>
            <Text style={styles.primaryBtnText}>+ Add Action</Text>
          </TouchableOpacity>
        </View>

        {/* Actions log */}
        {form.actions.length > 0 && (
          <View style={styles.logBlock}>
            <Text style={styles.logTitle}>Actions this hand</Text>
            {form.actions.map((a, i) => {
              const dot = STREET_COLORS_MAP[a.street as Street] ?? '#7C3AED';
              return (
                <View key={i} style={styles.logRow}>
                  <View style={[styles.logStreetDot, { backgroundColor: dot }]} />
                  <Text style={styles.logText}>
                    <Text style={styles.logActor}>{a.actor === 'hero' ? `Hero (${form.heroPosition})` : a.villain_position || '?'}</Text>
                    {' '}{a.action_type}{a.amount ? ` ${parseFloat(a.amount).toFixed(1)}bb` : ''}
                  </Text>
                  {i === form.actions.length - 1 && (
                    <TouchableOpacity onPress={form.undoLastAction}>
                      <Text style={styles.undoText}>undo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => form.setStep('result')}>
            <Text style={styles.secondaryBtnText}>End Hand ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, !form.canAdvanceStreet && styles.primaryBtnDisabled]}
            onPress={form.requestAdvanceStreet}
            disabled={!form.canAdvanceStreet}
          >
            <Text style={styles.primaryBtnText}>
              {isLastStreet ? 'To Result →' : `${nextStreetName} →`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hint when street advance is blocked */}
        {!form.canAdvanceStreet && (
          <Text style={styles.advanceHint}>Complete all actions before advancing</Text>
        )}
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: RESULT
  // ─────────────────────────────────────────────────────────────────────────────
  const resultAutoDetected = form.heroFolded || form.allVillainsFolded;
  const resultLabel = form.heroFolded
    ? 'You folded — lost'
    : form.allVillainsFolded
      ? 'All opponents folded — won'
      : `Result: ${form.resultType}`;
  const resultAmountBb = (form.computedResultCents / 100).toFixed(1);
  const resultIsPositive = form.computedResultCents >= 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hand Result</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        {(form.card1 || form.card2) && (
          <Text style={styles.summaryRow}>Cards: <Text style={styles.summaryVal}>{[form.card1, form.card2].filter(Boolean).join(' ')}</Text></Text>
        )}
        <Text style={styles.summaryRow}>Position: <Text style={styles.summaryVal}>{form.heroPosition || '—'}</Text></Text>
        {form.stackStr && <Text style={styles.summaryRow}>Stack: <Text style={styles.summaryVal}>{form.stackStr}bb</Text></Text>}
        <Text style={styles.summaryRow}>Actions logged: <Text style={styles.summaryVal}>{form.actions.length}</Text></Text>
        <Text style={styles.summaryRow}>Final pot: <Text style={styles.summaryVal}>{fmt(form.potCents)}</Text></Text>
        <Text style={styles.summaryRow}>Hero invested: <Text style={styles.summaryVal}>{fmt(form.heroInvestedCents)}</Text></Text>
        {form.boardCards.flop.length > 0 && (
          <Text style={styles.summaryRow}>Board: <Text style={styles.summaryVal}>{[...form.boardCards.flop, ...form.boardCards.turn, ...form.boardCards.river].join(' ')}</Text></Text>
        )}
      </View>

      <Text style={styles.label}>Result</Text>
      {resultAutoDetected ? (
        <View style={styles.resultAutoCard}>
          <Text style={styles.resultAutoLabel}>{resultLabel}</Text>
          <Text style={[styles.resultAutoAmount, resultIsPositive ? styles.resultWonAmount : styles.resultLostAmount]}>
            {resultIsPositive ? '+' : ''}{resultAmountBb}bb
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.resultRow}>
            <TouchableOpacity
              style={[styles.resultToggle, form.resultType === 'won' && styles.resultToggleWon]}
              onPress={() => form.setResultType('won')}
            >
              <Text style={[styles.resultToggleText, form.resultType === 'won' && styles.resultToggleTextActive]}>Won</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resultToggle, form.resultType === 'lost' && styles.resultToggleLost]}
              onPress={() => form.setResultType('lost')}
            >
              <Text style={[styles.resultToggleText, form.resultType === 'lost' && styles.resultToggleTextActive]}>Lost</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resultToggle, form.resultType === 'chopped' && styles.resultToggleChopped]}
              onPress={() => form.setResultType('chopped')}
            >
              <Text style={[styles.resultToggleText, form.resultType === 'chopped' && styles.resultToggleTextActive]}>Chopped</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.resultAutoCard}>
            <Text style={styles.resultAutoLabel}>{resultLabel}</Text>
            <Text style={[styles.resultAutoAmount, resultIsPositive ? styles.resultWonAmount : styles.resultLostAmount]}>
              {resultIsPositive ? '+' : ''}{resultAmountBb}bb
            </Text>
          </View>
        </>
      )}

      <Text style={styles.label}>Notes</Text>
      <TextInput style={[styles.input, styles.multiline]} value={form.notes} onChangeText={form.setNotes} multiline numberOfLines={3} placeholder="Any reads, mistakes, or interesting spots..." />

      {/* Showdown villain cards */}
      {form.showdownPositions.length > 0 && !form.heroFolded && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Villain Cards (optional)</Text>
          {form.showdownPositions.map(pos => (
            <View key={pos} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ width: 40, fontSize: 13, fontWeight: '600', color: '#374151' }}>{pos}</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={form.villainCards[pos] || ''}
                onChangeText={(v) => form.setVillainCard(pos, v)}
                placeholder="e.g. Ah Kd"
              />
            </View>
          ))}
        </View>
      )}

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => form.setStep('actions')}>
          <Text style={styles.secondaryBtnText}>← Actions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={form.submit} disabled={form.saving}>
          {form.saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Hand</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  content: { padding: 20, paddingBottom: 40 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  cancelLink: { color: '#7C3AED', fontSize: 15, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  multiline: { height: 80, textAlignVertical: 'top' },

  primaryBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', marginBottom: 12 },
  primaryBtnDisabled: { backgroundColor: '#c4b5fd' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  secondaryBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#7C3AED', alignItems: 'center', marginBottom: 12, marginRight: 10 },
  secondaryBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 15 },

  streetHeader: { borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streetLabel: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  potHeaderText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  potEditRow: { flexDirection: 'row', alignItems: 'center' },
  potInput: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, color: '#fff', fontSize: 14, minWidth: 60 },

  positionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  posChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  posChipFolded: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  posChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  posChipTextActive: { color: '#fff' },
  posChipTextFolded: { color: '#9ca3af', textDecorationLine: 'line-through' },

  actorBanner: { borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, backgroundColor: '#fff', alignItems: 'center' },
  actorBannerText: { fontSize: 16, fontWeight: '700', color: '#374151' },

  actionBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  skipBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#6b7280', backgroundColor: '#f9fafb', alignItems: 'center', marginBottom: 12 },
  skipBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  addActionBtn: { marginBottom: 12 },

  sizingBlock: { marginBottom: 4 },

  logBlock: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  logTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' },
  logRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logStreetDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  logText: { flex: 1, fontSize: 13, color: '#374151' },
  logActor: { fontWeight: '700' },
  undoText: { color: '#dc2626', fontSize: 12 },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },

  advanceHint: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: -8, marginBottom: 8 },

  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginBottom: 8 },
  summaryRow: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  summaryVal: { color: '#111827', fontWeight: '600' },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  resultToggle: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  resultToggleWon: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  resultToggleLost: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
  resultToggleChopped: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  resultToggleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  resultToggleTextActive: { color: '#111827' },
  resultAutoCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16, alignItems: 'center' },
  resultAutoLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  resultAutoAmount: { fontSize: 24, fontWeight: '800' },
  resultWonAmount: { color: '#16a34a' },
  resultLostAmount: { color: '#dc2626' },
});
