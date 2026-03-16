import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { createHand } from './api';

const POSITIONS = ['BTN', 'CO', 'MP', 'UTG', 'SB', 'BB'];
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_CHARS = ['s', 'h', 'd', 'c'];
const STREETS = ['preflop', 'flop', 'turn', 'river'] as const;

type Street = typeof STREETS[number];
type WizardStep = 'setup' | 'actions' | 'result';

interface ActionInput {
  street: string;
  actor: string;
  villain_position: string;
  action_type: string;
  amount: string;
}

interface Props {
  sessionId: number;
  onSaved: () => void;
  onCancel: () => void;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
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

  const selectRank = (rank: string) => {
    setPendingRank(rank);
  };

  const selectSuit = (suitIdx: number) => {
    if (!pendingRank) return;
    const newCard = pendingRank + SUIT_CHARS[suitIdx];
    if (activeSlot === 0) {
      onChange(newCard, card2);
      setActiveSlot(1);
    } else {
      onChange(card1, newCard);
    }
    setPendingRank(null);
  };

  const activateSlot = (slot: 0 | 1) => {
    setActiveSlot(slot);
    setPendingRank(null);
  };

  const c1 = displayCard(card1);
  const c2 = displayCard(card2);

  return (
    <View style={cpStyles.container}>
      <Text style={cpStyles.label}>Hero Cards</Text>

      {/* Card display slots */}
      <View style={cpStyles.slots}>
        <TouchableOpacity
          style={[cpStyles.slot, activeSlot === 0 && cpStyles.slotActive]}
          onPress={() => activateSlot(0)}
        >
          {c1 ? (
            <Text style={[cpStyles.cardText, { color: c1.color }]}>{c1.rank}{c1.suit}</Text>
          ) : (
            <Text style={cpStyles.slotEmpty}>{activeSlot === 0 ? '?' : '–'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[cpStyles.slot, activeSlot === 1 && cpStyles.slotActive]}
          onPress={() => activateSlot(1)}
        >
          {c2 ? (
            <Text style={[cpStyles.cardText, { color: c2.color }]}>{c2.rank}{c2.suit}</Text>
          ) : (
            <Text style={cpStyles.slotEmpty}>{activeSlot === 1 ? '?' : '–'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Rank grid */}
      <View style={cpStyles.rankGrid}>
        {RANKS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[cpStyles.rankBtn, pendingRank === r && cpStyles.rankBtnActive]}
            onPress={() => selectRank(r)}
          >
            <Text style={[cpStyles.rankText, pendingRank === r && cpStyles.rankTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Suit buttons (shown always, greyed out until rank picked) */}
      <View style={cpStyles.suitRow}>
        {SUITS.map((s, i) => (
          <TouchableOpacity
            key={s}
            style={[cpStyles.suitBtn, !pendingRank && cpStyles.suitBtnDisabled]}
            onPress={() => selectSuit(i)}
            disabled={!pendingRank}
          >
            <Text style={[cpStyles.suitText, { color: suitColor(s) }, !pendingRank && cpStyles.suitTextDisabled]}>
              {s}
            </Text>
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
  slot: {
    width: 60, height: 80, borderRadius: 8, borderWidth: 2,
    borderColor: '#e5e7eb', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  slotActive: { borderColor: '#7C3AED', borderWidth: 2 },
  slotEmpty: { fontSize: 24, color: '#d1d5db' },
  cardText: { fontSize: 22, fontWeight: '700' },
  rankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  rankBtn: {
    width: 40, height: 40, borderRadius: 8, borderWidth: 1,
    borderColor: '#d1d5db', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  rankBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  rankText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  rankTextActive: { color: '#fff' },
  suitRow: { flexDirection: 'row', gap: 10 },
  suitBtn: {
    width: 52, height: 48, borderRadius: 8, borderWidth: 1,
    borderColor: '#d1d5db', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  suitBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  suitText: { fontSize: 22, fontWeight: '600' },
  suitTextDisabled: { opacity: 0.35 },
});

// ─── BetSizingButtons ──────────────────────────────────────────────────────────

function BetSizingButtons({ potCents, remainingStackCents, lastBetCents, selected, onSelect }: {
  potCents: number;
  remainingStackCents: number;
  lastBetCents: number;
  selected: number | null;
  onSelect: (cents: number) => void;
}) {
  const minBet = lastBetCents > 0 ? lastBetCents * 2 : Math.round(potCents * 0.1);
  const sizings = [
    { label: 'Min', cents: minBet },
    { label: '33%', cents: Math.round(potCents * 0.33) },
    { label: '80%', cents: Math.round(potCents * 0.80) },
    { label: '150%', cents: Math.round(potCents * 1.50) },
    { label: 'All In', cents: remainingStackCents },
  ];

  return (
    <View style={bsStyles.row}>
      {sizings.map(({ label, cents }) => {
        const isActive = selected === cents;
        return (
          <TouchableOpacity
            key={label}
            style={[bsStyles.btn, isActive && bsStyles.btnActive]}
            onPress={() => onSelect(cents)}
          >
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
  btn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff',
    alignItems: 'center',
  },
  btnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  btnLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
  btnLabelActive: { color: '#fff' },
  btnAmount: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  btnAmountActive: { color: '#ede9fe' },
});

// ─── Chip picker ───────────────────────────────────────────────────────────────

function Chips({ options, value, onChange, size = 'md' }: {
  options: string[]; value: string; onChange: (v: string) => void; size?: 'sm' | 'md';
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[chipStyles.chip, value === opt && chipStyles.active, size === 'sm' && chipStyles.sm]}
          onPress={() => onChange(opt)}
        >
          <Text style={[chipStyles.text, value === opt && chipStyles.textActive, size === 'sm' && chipStyles.smText]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#d1d5db', marginRight: 8, backgroundColor: '#fff',
  },
  active: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  text: { fontSize: 14, color: '#374151', fontWeight: '500' },
  textActive: { color: '#fff', fontWeight: '700' },
  sm: { paddingHorizontal: 10, paddingVertical: 5 },
  smText: { fontSize: 12 },
});

// ─── Street colors ─────────────────────────────────────────────────────────────

const STREET_COLORS: Record<Street, string> = {
  preflop: '#7C3AED',
  flop: '#0ea5e9',
  turn: '#f59e0b',
  river: '#16a34a',
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function NewHandForm({ sessionId, onSaved, onCancel }: Props) {
  // Wizard step
  const [step, setStep] = useState<WizardStep>('setup');

  // Setup
  const [card1, setCard1] = useState('');
  const [card2, setCard2] = useState('');
  const [heroPosition, setHeroPosition] = useState('');
  const [stackStr, setStackStr] = useState('');
  const [startingPotStr, setStartingPotStr] = useState('');

  // Actions
  const [currentStreet, setCurrentStreet] = useState<Street>('preflop');
  const [potCents, setPotCents] = useState(0);
  const [heroInvestedCents, setHeroInvestedCents] = useState(0);
  const [lastBetCents, setLastBetCents] = useState(0);
  const [actions, setActions] = useState<ActionInput[]>([]);
  const [pendingActor, setPendingActor] = useState<'hero' | 'villain'>('hero');
  const [pendingVillainPos, setPendingVillainPos] = useState('');
  const [pendingActionType, setPendingActionType] = useState('');
  const [pendingAmountCents, setPendingAmountCents] = useState<number | null>(null);
  const [pendingAmountStr, setPendingAmountStr] = useState('');
  const [editingPot, setEditingPot] = useState(false);
  const [potEditStr, setPotEditStr] = useState('');

  // Result
  const [resultStr, setResultStr] = useState('');
  const [resultPositive, setResultPositive] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const stackCents = stackStr ? Math.round(parseFloat(stackStr) * 100) : 0;
  const remainingStack = Math.max(0, stackCents - heroInvestedCents);
  const needsAmount = ['bet', 'raise', 'call'].includes(pendingActionType);

  // ── Setup → Actions ──
  const startHand = () => {
    const initPot = startingPotStr ? Math.round(parseFloat(startingPotStr) * 100) : 0;
    setPotCents(initPot);
    setStep('actions');
  };

  // ── Add pending action ──
  const addPendingAction = () => {
    if (!pendingActionType) {
      Alert.alert('Select an action type');
      return;
    }
    if (needsAmount && pendingAmountCents === null) {
      Alert.alert('Enter a bet amount');
      return;
    }

    const amountCents = needsAmount ? pendingAmountCents! : null;
    const amountStr = amountCents !== null ? (amountCents / 100).toFixed(2) : '';

    setActions((prev) => [
      ...prev,
      {
        street: currentStreet,
        actor: pendingActor,
        villain_position: pendingActor === 'villain' ? pendingVillainPos : '',
        action_type: pendingActionType,
        amount: amountStr,
      },
    ]);

    if (amountCents !== null) {
      setPotCents((p) => p + amountCents);
      if (pendingActor === 'hero') {
        setHeroInvestedCents((h) => h + amountCents);
      }
      if (['bet', 'raise'].includes(pendingActionType)) {
        setLastBetCents(amountCents);
      }
    }

    // Reset pending (keep actor + villain pos for convenience)
    setPendingActionType('');
    setPendingAmountCents(null);
    setPendingAmountStr('');
  };

  // ── Advance street ──
  const advanceStreet = () => {
    const idx = STREETS.indexOf(currentStreet);
    if (idx >= STREETS.length - 1) {
      setStep('result');
      return;
    }
    setCurrentStreet(STREETS[idx + 1]);
    setPendingActionType('');
    setPendingAmountCents(null);
    setPendingAmountStr('');
    setLastBetCents(0);
  };

  // ── Handle manual amount input ──
  const handleAmountStr = (val: string) => {
    setPendingAmountStr(val);
    const n = parseFloat(val);
    setPendingAmountCents(!isNaN(n) ? Math.round(n * 100) : null);
  };

  const handleSizingSelect = (cents: number) => {
    setPendingAmountCents(cents);
    setPendingAmountStr((cents / 100).toFixed(2));
  };

  // ── Pot edit ──
  const startPotEdit = () => {
    setPotEditStr((potCents / 100).toFixed(2));
    setEditingPot(true);
  };
  const confirmPotEdit = () => {
    const n = parseFloat(potEditStr);
    if (!isNaN(n)) setPotCents(Math.round(n * 100));
    setEditingPot(false);
  };

  // ── Submit ──
  const submit = async () => {
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
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: SETUP
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>New Hand</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <CardPicker
          card1={card1}
          card2={card2}
          onChange={(c1, c2) => { setCard1(c1); setCard2(c2); }}
        />

        <Text style={styles.label}>Hero Position</Text>
        <Chips options={POSITIONS} value={heroPosition} onChange={setHeroPosition} />

        <Text style={styles.label}>Effective Stack ($)</Text>
        <TextInput
          style={styles.input}
          value={stackStr}
          onChangeText={setStackStr}
          placeholder="200"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Starting Pot ($) — optional, for bet sizing</Text>
        <TextInput
          style={styles.input}
          value={startingPotStr}
          onChangeText={setStartingPotStr}
          placeholder="3 (e.g. blinds)"
          keyboardType="decimal-pad"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, !heroPosition && styles.primaryBtnDisabled]}
          onPress={startHand}
          disabled={!heroPosition}
        >
          <Text style={styles.primaryBtnText}>Start Hand →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 'actions') {
    const streetColor = STREET_COLORS[currentStreet];
    const streetIdx = STREETS.indexOf(currentStreet);
    const isLastStreet = streetIdx === STREETS.length - 1;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Street header */}
        <View style={[styles.streetHeader, { backgroundColor: streetColor }]}>
          <Text style={styles.streetLabel}>{currentStreet.toUpperCase()}</Text>
          {editingPot ? (
            <View style={styles.potEditRow}>
              <Text style={styles.potHeaderText}>Pot: $</Text>
              <TextInput
                style={styles.potInput}
                value={potEditStr}
                onChangeText={setPotEditStr}
                onBlur={confirmPotEdit}
                onSubmitEditing={confirmPotEdit}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          ) : (
            <TouchableOpacity onPress={startPotEdit}>
              <Text style={styles.potHeaderText}>Pot: {fmt(potCents)} ✎</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actor toggle */}
        <View style={styles.actorRow}>
          {(['hero', 'villain'] as const).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.actorBtn, pendingActor === a && styles.actorBtnActive]}
              onPress={() => setPendingActor(a)}
            >
              <Text style={[styles.actorText, pendingActor === a && styles.actorTextActive]}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Villain position */}
        {pendingActor === 'villain' && (
          <>
            <Text style={styles.label}>Villain Position</Text>
            <Chips options={POSITIONS} value={pendingVillainPos} onChange={setPendingVillainPos} />
          </>
        )}

        {/* Action type */}
        <Text style={styles.label}>Action</Text>
        <Chips
          options={['fold', 'check', 'call', 'bet', 'raise']}
          value={pendingActionType}
          onChange={setPendingActionType}
        />

        {/* Bet sizing */}
        {needsAmount && (
          <View style={styles.sizingBlock}>
            <BetSizingButtons
              potCents={potCents}
              remainingStackCents={remainingStack}
              lastBetCents={lastBetCents}
              selected={pendingAmountCents}
              onSelect={handleSizingSelect}
            />
            <TextInput
              style={styles.input}
              value={pendingAmountStr}
              onChangeText={handleAmountStr}
              placeholder="or enter amount"
              keyboardType="decimal-pad"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, !pendingActionType && styles.primaryBtnDisabled]}
          onPress={addPendingAction}
          disabled={!pendingActionType}
        >
          <Text style={styles.primaryBtnText}>+ Add Action</Text>
        </TouchableOpacity>

        {/* Actions log */}
        {actions.length > 0 && (
          <View style={styles.logBlock}>
            <Text style={styles.logTitle}>Actions this hand</Text>
            {actions.map((a, i) => {
              const streetColor2 = STREET_COLORS[a.street as Street] ?? '#7C3AED';
              return (
                <View key={i} style={styles.logRow}>
                  <View style={[styles.logStreetDot, { backgroundColor: streetColor2 }]} />
                  <Text style={styles.logText}>
                    <Text style={styles.logActor}>{a.actor === 'hero' ? 'Hero' : `Villain (${a.villain_position || '?'})`}</Text>
                    {' '}{a.action_type}{a.amount ? ` $${parseFloat(a.amount).toFixed(2)}` : ''}
                  </Text>
                  {i === actions.length - 1 && (
                    <TouchableOpacity onPress={() => setActions((prev) => prev.slice(0, -1))}>
                      <Text style={styles.undoText}>undo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Footer nav */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('result')}>
            <Text style={styles.secondaryBtnText}>End Hand ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={advanceStreet}>
            <Text style={styles.primaryBtnText}>
              {isLastStreet ? 'To Result →' : `${STREETS[streetIdx + 1].charAt(0).toUpperCase() + STREETS[streetIdx + 1].slice(1)} →`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP: RESULT
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hand Result</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Summary</Text>
        {(card1 || card2) && (
          <Text style={styles.summaryRow}>
            Cards: <Text style={styles.summaryVal}>{[card1, card2].filter(Boolean).join(' ')}</Text>
          </Text>
        )}
        <Text style={styles.summaryRow}>
          Position: <Text style={styles.summaryVal}>{heroPosition || '—'}</Text>
        </Text>
        {stackStr && (
          <Text style={styles.summaryRow}>
            Stack: <Text style={styles.summaryVal}>${stackStr}</Text>
          </Text>
        )}
        <Text style={styles.summaryRow}>
          Actions logged: <Text style={styles.summaryVal}>{actions.length}</Text>
        </Text>
      </View>

      {/* Result */}
      <Text style={styles.label}>Result</Text>
      <View style={styles.resultRow}>
        <TouchableOpacity
          style={[styles.resultToggle, resultPositive && styles.resultToggleWon]}
          onPress={() => setResultPositive(true)}
        >
          <Text style={[styles.resultToggleText, resultPositive && styles.resultToggleTextActive]}>Won</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resultToggle, !resultPositive && styles.resultToggleLost]}
          onPress={() => setResultPositive(false)}
        >
          <Text style={[styles.resultToggleText, !resultPositive && styles.resultToggleTextActive]}>Lost</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, styles.resultInput]}
          value={resultStr}
          onChangeText={setResultStr}
          placeholder="50"
          keyboardType="decimal-pad"
        />
      </View>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        placeholder="Any reads, mistakes, or interesting spots..."
      />

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('actions')}>
          <Text style={styles.secondaryBtnText}>← Actions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Hand</Text>}
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
  input: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12,
  },
  multiline: { height: 80, textAlignVertical: 'top' },

  primaryBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    backgroundColor: '#7C3AED', alignItems: 'center', marginBottom: 12,
  },
  primaryBtnDisabled: { backgroundColor: '#c4b5fd' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  secondaryBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#7C3AED', alignItems: 'center', marginBottom: 12, marginRight: 10,
  },
  secondaryBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 15 },

  // Street header
  streetHeader: {
    borderRadius: 12, padding: 14, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  streetLabel: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  potHeaderText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  potEditRow: { flexDirection: 'row', alignItems: 'center' },
  potInput: {
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, color: '#fff', fontSize: 14, minWidth: 60,
  },

  // Actor toggle
  actorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actorBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff',
    alignItems: 'center',
  },
  actorBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  actorText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  actorTextActive: { color: '#fff' },

  // Sizing block
  sizingBlock: { marginBottom: 4 },

  // Actions log
  logBlock: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16,
  },
  logTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' },
  logRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logStreetDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  logText: { flex: 1, fontSize: 13, color: '#374151' },
  logActor: { fontWeight: '700' },
  undoText: { color: '#dc2626', fontSize: 12 },

  // Footer
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },

  // Result
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginBottom: 8 },
  summaryRow: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  summaryVal: { color: '#111827', fontWeight: '600' },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  resultToggle: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  resultToggleWon: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  resultToggleLost: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
  resultToggleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  resultToggleTextActive: { color: '#111827' },
  resultInput: { flex: 1, marginBottom: 0 },
});
