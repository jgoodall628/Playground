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
| `game_type` | string | no (e.g. "NL Hold'em") |
| `stakes` | string | no (e.g. "1/2") |
| `duration_minutes` | integer | no |

Computed: `profit_cents = cash_out_cents - buy_in_cents`

### PokerHand
Belongs to `PokerSession`.

| Field | Type | Required |
|---|---|---|
| `hero_cards` | string | no (e.g. "Ah Kd") |
| `hero_position` | string | no (BTN/CO/MP/UTG/SB/BB) |
| `effective_stack_cents` | integer | no |
| `pot_result_cents` | integer | no (positive = won, negative = lost) |
| `notes` | text | no |

### PokerAction
Belongs to `PokerHand`. One row per action.

| Field | Type | Required |
|---|---|---|
| `street` | enum | yes (preflop/flop/turn/river) |
| `actor` | enum | yes (hero/villain) |
| `villain_position` | string | only when actor = villain |
| `action_type` | enum | yes (fold/check/call/bet/raise) |
| `amount_cents` | integer | no (null for fold/check) |
| `sequence` | integer | yes (ordering within street) |

---

## API Endpoints

All routes nested under `/api/v1/poker/`.

### Sessions
- `GET /sessions` — list all, ordered by date desc
- `POST /sessions` — create
- `GET /sessions/:id` — detail with hands
- `PATCH /sessions/:id` — update
- `DELETE /sessions/:id`

### Hands
- `GET /sessions/:session_id/hands` — list hands for a session
- `POST /sessions/:session_id/hands` — create
- `GET /sessions/:session_id/hands/:id` — detail with actions
- `PATCH /sessions/:session_id/hands/:id`
- `DELETE /sessions/:session_id/hands/:id`

### Actions
- `POST /sessions/:session_id/hands/:hand_id/actions` — create
- `PATCH /sessions/:session_id/hands/:hand_id/actions/:id`
- `DELETE /sessions/:session_id/hands/:hand_id/actions/:id`

### Stats
- `GET /stats` — aggregated data: total profit, session count, profit by date (for line chart), win rate by position (for bar chart)

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
  │           └── NewHandForm
  │                 └── ActionEntry (per street)
  ├── [Hands tab] AllHandsList
  │     └── HandDetail (static summary)
  └── [Stats tab] StatsScreen
```

### Screen Descriptions

**SessionList**
Scrollable list of sessions ordered by date desc. Each row shows date, stakes, location (if set), and profit/loss colored green/red. Floating action button to create a new session.

**NewSessionForm**
Form with required fields (date, buy-in, cash-out) and optional fields (location, game type, stakes, duration). Required fields marked visually.

**SessionDetail**
Session summary header (buy-in, cash-out, profit, duration). List of hands below with hero cards, position, and result per row. "Add Hand" button.

**NewHandForm**
Fields for hero cards, position, effective stack, result, notes. Street sections (preflop → flop → turn → river), each with an "Add Action" button that appends an inline action row (actor, position if villain, action type, amount).

**AllHandsList**
All hands across all sessions, ordered by recency. Each row shows hero cards, position, result (profit/loss), and session context (date, stakes). Filterable by position or result (won/lost).

**HandDetail**
Static summary view. Hero cards and position at top. Street-by-street action list (preflop → flop → turn → river), with each action showing actor, position (if villain), action type, and amount. Result displayed at bottom. Notes shown if present.

**StatsScreen**
- Line chart: cumulative profit/loss over time (by session date)
- Bar chart: win rate by hero position
- Summary cards: total profit, total sessions, average profit per session

---

## Architecture Notes

- Sub-app follows the existing Playground pattern: new component at `frontend/src/sub-apps/poker-tracker/`, registered in `registry.ts`, backed by new Rails models.
- All monetary values stored as integers (cents) in the database; formatted for display in the frontend.
- Backend: new Rails models `PokerSession`, `PokerHand`, `PokerAction` with appropriate validations and nested routes.
- No authentication required (single-user app).
- Data persists to the existing Rails backend (SQLite dev / PostgreSQL prod).
