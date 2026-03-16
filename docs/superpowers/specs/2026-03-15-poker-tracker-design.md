# Poker Tracker Sub-App — Design Spec

**Date:** 2026-03-15

## Overview

A poker session and hand tracking sub-app built within the Playground platform. Primarily used after sessions to log results and review hands; occasionally used at the table for quick capture. Hero-centric: focuses on the player's own experience with villain actions recorded for context.

---

## Data Model

### PokerSession
| Field | Type | Required |
|---|---|---|
| `date` | date | yes |
| `buy_in_cents` | integer | yes |
| `cash_out_cents` | integer | yes |
| `location` | string | no |
| `game_type` | string | no (e.g. "NL Hold'em", "PLO") |
| `stakes` | string | no (e.g. "1/2") |
| `duration_minutes` | integer | no |

Computed: `profit_cents = cash_out_cents - buy_in_cents` (not stored)

### PokerHand
Belongs to `PokerSession`. Deleting a session cascades to destroy its hands.

| Field | Type | Required |
|---|---|---|
| `hero_cards` | string | no (e.g. "Ah Kd") |
| `hero_position` | enum | no (BTN/CO/MP/UTG/SB/BB) |
| `effective_stack_cents` | integer | no |
| `pot_result_cents` | integer | no (positive = won, negative = lost; null = not recorded) |
| `notes` | text | no |

`hero_position` is an enum (enforced at model level) to ensure consistent chart grouping in the Stats screen.

### PokerAction
Belongs to `PokerHand`. Deleting a hand cascades to destroy its actions.

| Field | Type | Required |
|---|---|---|
| `street` | enum | yes (preflop/flop/turn/river) |
| `actor` | enum | yes (hero/villain) |
| `villain_position` | enum | only when actor = villain (BTN/CO/MP/UTG/SB/BB) |
| `action_type` | enum | yes (fold/check/call/bet/raise) |
| `amount_cents` | integer | no (null for fold/check) |
| `sequence` | integer | yes |

`sequence` is assigned by the client (sequential integers starting at 1 per hand, across all streets). Gaps in sequence values are acceptable — ordering is by relative value only. When an action is deleted, sequences are not renumbered.

`street` enum is declared in play order: preflop (0), flop (1), turn (2), river (3). Actions are sorted by street then sequence for display.

`villain_position` is required when `actor` is villain (conditional validation: `validates :villain_position, presence: true, if: -> { actor == 'villain' }`).

`amount_cents` must be positive when present (`validates :amount_cents, numericality: { greater_than: 0 }, allow_nil: true`). Fold and check always have null amount.

---

## API Endpoints

All routes nested under `/api/v1/poker/`.

### Sessions
- `GET /sessions` — list all, ordered by date desc; response includes `profit_cents` computed per session
- `POST /sessions` — create
- `GET /sessions/:id` — detail; response includes nested `hands` array (without actions)
- `PATCH /sessions/:id` — update
- `DELETE /sessions/:id` — destroys session and all associated hands and actions

### Hands
- `GET /hands` — all hands across all sessions, ordered by `created_at` desc; response includes session context (`date`, `stakes`). No server-side filtering — the frontend filters client-side.
- `GET /sessions/:session_id/hands` — list hands for a session
- `POST /sessions/:session_id/hands` — create hand with nested actions in a single request (see Nested Creation below)
- `GET /sessions/:session_id/hands/:id` — detail; response includes nested `actions` array
- `PATCH /sessions/:session_id/hands/:id` — update hand fields only (not actions). Nested `poker_actions_attributes` is not supported on PATCH; updating a hand's actions after creation requires individual action POST/PATCH/DELETE endpoints.
- `DELETE /sessions/:session_id/hands/:id` — destroys hand and all associated actions

### Actions
- `POST /sessions/:session_id/hands/:hand_id/actions` — create a single action (used for at-the-table quick additions)
- `PATCH /sessions/:session_id/hands/:hand_id/actions/:id` — update
- `DELETE /sessions/:session_id/hands/:hand_id/actions/:id` — delete

### Stats
- `GET /stats` — aggregated: total profit, session count, average profit per session, profit by session date (array for line chart), win rate by position (object for bar chart)

---

## Nested Creation

When a hand is submitted via `POST /sessions/:session_id/hands`, it accepts a single JSON payload with nested actions using Rails `accepts_nested_attributes_for`:

```json
{
  "poker_hand": {
    "hero_cards": "Ah Kd",
    "hero_position": "BTN",
    "effective_stack_cents": 20000,
    "pot_result_cents": 5000,
    "notes": "",
    "poker_actions_attributes": [
      { "street": "preflop", "actor": "hero", "action_type": "raise", "amount_cents": 600, "sequence": 1 },
      { "street": "preflop", "actor": "villain", "villain_position": "BB", "action_type": "call", "amount_cents": 600, "sequence": 2 },
      { "street": "flop", "actor": "hero", "action_type": "bet", "amount_cents": 800, "sequence": 3 },
      { "street": "flop", "actor": "villain", "villain_position": "BB", "action_type": "fold", "sequence": 4 }
    ]
  }
}
```

This is the primary hand-entry flow (used after sessions). The standalone action endpoints exist for at-the-table use when actions are appended one at a time to a previously created hand.

---

## Representative Response Shapes

### `GET /sessions`
```json
[
  {
    "id": 1,
    "date": "2026-03-15",
    "buy_in_cents": 20000,
    "cash_out_cents": 25000,
    "profit_cents": 5000,
    "location": "Commerce Casino",
    "game_type": "NL Hold'em",
    "stakes": "1/2",
    "duration_minutes": 240
  }
]
```

### `GET /hands`
```json
[
  {
    "id": 12,
    "hero_cards": "Ah Kd",
    "hero_position": "BTN",
    "pot_result_cents": 5000,
    "session": {
      "id": 1,
      "date": "2026-03-15",
      "stakes": "1/2"
    }
  }
]
```

### `GET /sessions/:id`
```json
{
  "id": 1,
  "date": "2026-03-15",
  "buy_in_cents": 20000,
  "cash_out_cents": 25000,
  "profit_cents": 5000,
  "location": "Commerce Casino",
  "game_type": "NL Hold'em",
  "stakes": "1/2",
  "duration_minutes": 240,
  "hands": [
    { "id": 12, "hero_cards": "Ah Kd", "hero_position": "BTN", "pot_result_cents": 5000 }
  ]
}
```

### `GET /sessions/:session_id/hands/:id`
```json
{
  "id": 12,
  "session_id": 1,
  "hero_cards": "Ah Kd",
  "hero_position": "BTN",
  "effective_stack_cents": 20000,
  "pot_result_cents": 5000,
  "notes": "",
  "actions": [
    { "id": 1, "street": "preflop", "actor": "hero", "villain_position": null, "action_type": "raise", "amount_cents": 600, "sequence": 1 },
    { "id": 2, "street": "preflop", "actor": "villain", "villain_position": "BB", "action_type": "call", "amount_cents": 600, "sequence": 2 }
  ]
}
```

### `GET /stats`
```json
{
  "total_profit_cents": 150000,
  "session_count": 22,
  "avg_profit_per_session_cents": 6818,
  "profit_by_date": [
    { "date": "2026-03-10", "profit_cents": -3000 },
    { "date": "2026-03-15", "profit_cents": 5000 }
  ],
  "win_rate_by_position": {
    "BTN": 0.62,
    "CO": 0.55,
    "MP": 0.48,
    "UTG": 0.40,
    "SB": 0.44,
    "BB": 0.38
  }
}
```

Win rate = percentage of hands at that position where `pot_result_cents > 0`, excluding hands where `pot_result_cents` is null. Positions with zero recorded hands are omitted from the response.

`profit_by_date` returns raw per-session profit values ordered by date ascending. The frontend computes the running cumulative total for chart rendering.

---

## Frontend Sub-App

**Slug:** `poker-tracker`
Registered in `frontend/src/sub-apps/registry.ts`.

### Screen Structure

```
PokerHome (3-tab layout: Sessions | Hands | Stats)
  ├── [Sessions tab] SessionList
  │     ├── NewSessionForm
  │     └── SessionDetail
  │           ├── HandList
  │           │     └── HandDetail (static summary)
  │           └── NewHandForm (submits hand + all actions in one request)
  ├── [Hands tab] AllHandsList
  │     └── HandDetail (static summary)
  └── [Stats tab] StatsScreen
```

### Screen Descriptions

**SessionList**
Scrollable list of sessions ordered by date desc. Each row shows date, stakes, location (if set), and profit/loss colored green/red. Floating action button to create a new session.

**NewSessionForm**
Form with required fields (date, buy-in, cash-out) and optional fields (location, game type, stakes, duration). Required fields marked visually. Duration input accepts hours and minutes (e.g. "2h 30m"), stored as total minutes.

**SessionDetail**
Session summary header (buy-in, cash-out, profit, duration). List of hands below with hero cards, position, and result per row. "Add Hand" button.

**NewHandForm**
Fields for hero cards, position, effective stack, result, notes. Street sections (preflop → flop → turn → river), each with an "Add Action" button that appends an inline action row (actor, position if villain, action type, amount). On submit, the entire hand + all actions are sent in a single nested POST request.

**AllHandsList**
All hands across all sessions, fetched from `GET /hands`, ordered by recency. Each row shows hero cards, position, result (profit/loss), and session context (date, stakes). Client-side filterable by position or result (won/lost) — dataset is small enough for local filtering.

**HandDetail**
Static summary view. Hero cards and position at top. Street-by-street action list (preflop → flop → turn → river), with each action showing actor, position (if villain), action type, and amount. Result displayed at bottom. Notes shown if present.

**StatsScreen**
- Line chart: profit/loss over time (by session date, cumulative running total computed client-side from `profit_by_date` values)
- Bar chart: win rate by hero position (positions with no recorded hands omitted)
- Summary cards: total profit, total sessions, average profit per session

---

## Architecture Notes

- Sub-app follows the existing Playground pattern: new component at `frontend/src/sub-apps/poker-tracker/`, registered in `registry.ts`, backed by new Rails models. The root `PokerHome` component must accept a `slug: string` prop to satisfy the `SubAppComponent` type contract (it can be ignored internally).
- All monetary values stored as integers (cents) in the database; formatted for display in the frontend (e.g. `$200.00`).
- Backend: new Rails models `PokerSession`, `PokerHand`, `PokerAction` with `dependent: :destroy` on associations, appropriate validations, and nested routes under `/api/v1/poker/`.
- `hero_position` and `villain_position` are enforced as enums at the model level (BTN/CO/MP/UTG/SB/BB).
- No authentication required (single-user app).
- Data persists to the existing Rails backend (SQLite dev / PostgreSQL prod).
