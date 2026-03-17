# Codebase Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a live bug, improve developer experience, harden API security, and make the codebase clearer for humans and AI agents.

**Architecture:** Nine independent tasks split across backend (Rails) and frontend (Expo/RN). Tasks 1-5 are urgent fixes; tasks 6-9 are structural improvements. All tasks are independent and can be executed in any order. No new files except `frontend/src/config.ts` and `frontend/src/sub-apps/poker-tracker/constants.ts`.

**Tech Stack:** Ruby 3.3.6 / Rails 8.1 (backend), TypeScript / React Native / Expo SDK 54 (frontend), GitHub Actions (CI).

---

## File Map

Files **created**:
- `frontend/src/config.ts` — single API base URL constant (replaces two hardcoded strings)
- `frontend/src/sub-apps/poker-tracker/constants.ts` — POSITIONS, STREETS, ACTION_TYPES, order arrays, BB constants, helper types, `fmt`, `actionOrderFor` (extracted from `useHandForm.ts`)

Files **modified**:
- `backend/app/models/poker_hand.rb` — add LJ/HJ to POSITIONS; add schema comment block
- `backend/app/models/poker_action.rb` — add LJ/HJ to POSITIONS; add schema comment block
- `backend/app/models/poker_session.rb` — add schema comment block
- `backend/app/controllers/application_controller.rb` — add write-protection token guard
- `.github/workflows/deploy.yml` — add `needs: deploy-backend` to `update-frontend` job; add health-check poll step
- `frontend/src/api/client.ts` — import API_BASE_URL from `src/config.ts`
- `frontend/src/sub-apps/poker-tracker/api.ts` — move types to `constants.ts`; import API_BASE from `src/config.ts`; keep all API functions
- `frontend/src/sub-apps/poker-tracker/NewHandForm.tsx` — update imports of POSITIONS/STREETS/fmt/Street to come from `./constants`
- `frontend/src/sub-apps/poker-tracker/useHandForm.test.ts` — **no change needed**; its imports of BIG_BLIND, SMALL_BLIND, PREFLOP_ORDER, POSTFLOP_ORDER, fmt, actionOrderFor from `./useHandForm` are covered by the re-export block added to `useHandForm.ts`
- `frontend/src/sub-apps/poker-tracker/useHandForm.ts` — import all constants/types from `./constants`; remove the Constants and Types sections
- `frontend/src/sub-apps/poker-tracker/PokerHome.tsx` → renamed to `PokerTrackerNavigator.tsx`
- `frontend/src/sub-apps/registry.ts` — update import; add workflow comment

---

### Task 1: Fix POSITIONS bug (backend)

**Files:**
- Modify: `backend/app/models/poker_hand.rb:2`
- Modify: `backend/app/models/poker_action.rb:5`

The frontend POSITIONS list includes `LJ` (lojack) and `HJ` (hijack). The backend does not. Any hand logged from the `LJ` or `HJ` seats fails the `inclusion` validation silently.

- [ ] **Step 1: Update PokerHand POSITIONS**

In `backend/app/models/poker_hand.rb`, change line 2:

```ruby
POSITIONS = %w[BTN CO MP LJ HJ UTG SB BB].freeze
```

`MP` is kept for backward compatibility with any existing records.

- [ ] **Step 2: Update PokerAction POSITIONS**

In `backend/app/models/poker_action.rb`, change line 5:

```ruby
POSITIONS = %w[BTN CO MP LJ HJ UTG SB BB].freeze
```

- [ ] **Step 3: Verify with Rails console**

```sh
cd /home/user/Playground/backend
mise exec -- bin/rails runner "puts PokerHand::POSITIONS.inspect; puts PokerAction::POSITIONS.inspect"
```

Expected output includes `LJ` and `HJ` in both arrays.

- [ ] **Step 4: Commit**

```sh
git add backend/app/models/poker_hand.rb backend/app/models/poker_action.rb
git commit -m "fix: add LJ and HJ to backend POSITIONS — closes validation mismatch with frontend"
```

---

### Task 2: Add schema comments to poker models

**Files:**
- Modify: `backend/app/models/poker_session.rb`
- Modify: `backend/app/models/poker_hand.rb`
- Modify: `backend/app/models/poker_action.rb`

Schema comments tell readers (human and AI) the exact columns without reading migrations. Add them as a comment block at the top of each model file, derived from `backend/db/schema.rb`.

- [ ] **Step 1: Add schema comment to poker_session.rb**

Insert this block at the top of `backend/app/models/poker_session.rb` (before `class PokerSession`):

```ruby
# == Schema: poker_sessions ==
#
# id               :integer   not null, primary key
# buy_in_cents     :integer   not null
# cash_out_cents   :integer   not null
# date             :date      not null
# duration_minutes :integer
# game_type        :string
# location         :string
# stakes           :string
# created_at       :datetime  not null
# updated_at       :datetime  not null
#
```

- [ ] **Step 2: Add schema comment to poker_hand.rb**

Insert at the top of `backend/app/models/poker_hand.rb`:

```ruby
# == Schema: poker_hands ==
#
# id                    :integer  not null, primary key
# created_at            :datetime not null
# effective_stack_cents :integer
# hero_cards            :string
# hero_position         :string
# notes                 :text
# poker_session_id      :integer  not null, FK → poker_sessions
# pot_result_cents      :integer
# updated_at            :datetime not null
#
```

- [ ] **Step 3: Add schema comment to poker_action.rb**

Insert at the top of `backend/app/models/poker_action.rb`:

```ruby
# == Schema: poker_actions ==
#
# id               :integer  not null, primary key
# poker_hand_id    :integer  not null, FK → poker_hands
# action_type      :string   not null   (fold/check/call/bet/raise)
# actor            :string   not null   (hero/villain)
# amount_cents     :integer
# sequence         :integer  not null
# street           :string   not null   (preflop/flop/turn/river)
# villain_position :string
# created_at       :datetime not null
# updated_at       :datetime not null
#
```

- [ ] **Step 4: Verify Rails still loads cleanly**

```sh
cd /home/user/Playground/backend
mise exec -- bin/rails runner "puts PokerSession.column_names.inspect"
```

Expected: list of column names, no errors.

- [ ] **Step 5: Commit**

```sh
git add backend/app/models/poker_session.rb backend/app/models/poker_hand.rb backend/app/models/poker_action.rb
git commit -m "docs: add schema comment blocks to poker models"
```

---

### Task 3: Create shared API base URL config

**Files:**
- Create: `frontend/src/config.ts`
- Modify: `frontend/src/api/client.ts:3`
- Modify: `frontend/src/sub-apps/poker-tracker/api.ts:1`

Two files independently hardcode the production URL. Both need a local dev URL. Fix once in a shared config.

- [ ] **Step 1: Create `frontend/src/config.ts`**

```ts
const DEV_API_BASE = 'http://localhost:3000/api/v1';
const PROD_API_BASE = 'https://playground-api-dyu9.onrender.com/api/v1';

export const API_BASE_URL = __DEV__ ? DEV_API_BASE : PROD_API_BASE;
```

- [ ] **Step 2: Update `frontend/src/api/client.ts`**

Replace:
```ts
const API_BASE_URL = 'https://playground-api-dyu9.onrender.com/api/v1';
```
With:
```ts
import { API_BASE_URL } from '../config';
```

The rest of the file is unchanged.

- [ ] **Step 3: Update `frontend/src/sub-apps/poker-tracker/api.ts`**

Replace line 1:
```ts
const API_BASE = 'https://playground-api-dyu9.onrender.com/api/v1/poker';
```
With:
```ts
import { API_BASE_URL } from '../../config';

const API_BASE = `${API_BASE_URL}/poker`;
```

- [ ] **Step 4: TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```sh
git add frontend/src/config.ts frontend/src/api/client.ts frontend/src/sub-apps/poker-tracker/api.ts
git commit -m "feat: introduce shared API base URL config with __DEV__ toggle"
```

---

### Task 4: Add write-protection token to API

**Files:**
- Modify: `backend/app/controllers/application_controller.rb`

All write operations (POST, PATCH, PUT, DELETE) currently require no auth. A `before_action` guard checks a token header on mutating requests only — GET requests and the health check are unaffected.

- [ ] **Step 1: Update ApplicationController**

Replace the full content of `backend/app/controllers/application_controller.rb`:

```ruby
class ApplicationController < ActionController::API
  before_action :require_write_token

  private

  def require_write_token
    return if request.get? || request.head?

    expected = ENV['API_WRITE_TOKEN'].presence
    return unless expected  # token not configured → open (dev/test)

    provided = request.headers['Authorization']&.delete_prefix('Bearer ')
    head :unauthorized unless provided == expected
  end
end
```

When `API_WRITE_TOKEN` is not set (local dev, test), all requests pass through. In production, set the env var on Render and in the frontend.

- [ ] **Step 2: Add the token to `frontend/src/config.ts`**

Append to `frontend/src/config.ts`:

```ts
// Set via EAS environment variable (preview / production channels)
// Leave blank for local dev — backend allows unauthenticated writes when token is unset
export const API_WRITE_TOKEN = process.env.EXPO_PUBLIC_API_WRITE_TOKEN ?? '';
```

- [ ] **Step 3: Thread the token through the poker API client**

In `frontend/src/sub-apps/poker-tracker/api.ts`, update the import line and the `request` function:

Change the import line to:
```ts
import { API_BASE_URL, API_WRITE_TOKEN } from '../../config';
```

Update the `request` function headers:
```ts
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
```

- [ ] **Step 4: TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Verify backend still boots**

```sh
cd /home/user/Playground/backend
mise exec -- bin/rails runner "puts ApplicationController.ancestors.first"
```

Expected: `ApplicationController`

- [ ] **Step 6: Commit**

```sh
git add backend/app/controllers/application_controller.rb frontend/src/config.ts frontend/src/sub-apps/poker-tracker/api.ts
git commit -m "feat: add write-protection token guard to API; thread token through poker client"
```

> **After merging:** Set `API_WRITE_TOKEN` as an env var in Render dashboard (under your web service → Environment). Set `EXPO_PUBLIC_API_WRITE_TOKEN` as an EAS secret for the preview and production environments.

---

### Task 5: Fix CI race condition — sequential backend/frontend deploys

**Files:**
- Modify: `.github/workflows/deploy.yml`

Both deploy jobs currently run in parallel and have no ordering. The OTA JS update can reach devices before the Render backend finishes deploying. Fix: `update-frontend` declares `needs: [detect-changes, deploy-backend]` so it only starts after the backend deploy job completes. A health-check poll step ensures Render is actually up before the OTA update is published.

The `needs` array must handle two scenarios:
1. Only frontend changed — `deploy-backend` is skipped; `update-frontend` should still run.
2. Both changed — `update-frontend` waits for `deploy-backend`.

GitHub Actions `needs` with a skipped job is fine — a skipped job is treated as success.

- [ ] **Step 1: Update `.github/workflows/deploy.yml`**

Replace the `update-frontend` job definition (lines 36-59) with:

```yaml
  update-frontend:
    needs: [detect-changes, deploy-backend]
    if: needs.detect-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Wait for backend to be healthy
        if: needs.detect-changes.outputs.backend == 'true'
        run: |
          for i in 1 2 3 4 5 6 7 8 9 10; do
            status=$(curl -s -o /dev/null -w "%{http_code}" https://playground-api-dyu9.onrender.com/up)
            if [ "$status" = "200" ]; then echo "Backend healthy"; exit 0; fi
            echo "Attempt $i: got $status, retrying in 15s..."
            sleep 15
          done
          echo "Backend did not become healthy in time" && exit 1

      - name: Publish OTA update
        working-directory: frontend
        run: eas update --branch preview --message "${{ github.event.head_commit.message }}" --environment preview --non-interactive
```

The health-check step only runs when the backend also changed (`if: needs.detect-changes.outputs.backend == 'true'`). Frontend-only pushes skip it.

Also update the `deploy-backend` job to capture when it's done so downstream jobs can depend on it. The existing job is fine — just add an explicit `id` for the step for clarity (optional but good practice).

- [ ] **Step 2: Commit**

```sh
git add .github/workflows/deploy.yml
git commit -m "ci: make frontend OTA deploy wait for backend; add health-check poll"
```

---

### Task 6: Extract poker constants and types to `constants.ts`

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/constants.ts`
- Modify: `frontend/src/sub-apps/poker-tracker/useHandForm.ts`
- Modify: `frontend/src/sub-apps/poker-tracker/api.ts` (types section only)

`useHandForm.ts` currently exports constants, types, and helper functions that have nothing to do with the hook itself. `api.ts` exports TypeScript interfaces. Moving both sets to a single `constants.ts` makes each file's responsibility obvious.

- [ ] **Step 1: Create `frontend/src/sub-apps/poker-tracker/constants.ts`**

This file takes the "Constants", "Types", and "Helpers" sections from `useHandForm.ts`, plus the interface/type definitions from `api.ts`:

```ts
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
```

- [ ] **Step 2: Remove the Constants/Types/Helpers sections from `useHandForm.ts`**

Delete lines 5–46 (the `// ─── Constants`, `// ─── Types`, and `// ─── Helpers` sections).

Replace the removed lines with these two blocks:

```ts
import {
  STREETS, BIG_BLIND, SMALL_BLIND,
  type Street, type ActionType, type WizardStep,
  type ActionInput, type BoardCards,
  actionOrderFor,
} from './constants';

// Re-export for consumers that import these from useHandForm
export {
  POSITIONS, STREETS, ACTION_TYPES, PREFLOP_ORDER, POSTFLOP_ORDER,
  BIG_BLIND, SMALL_BLIND, fmt, actionOrderFor,
  type Street, type ActionType, type WizardStep, type ActionInput, type BoardCards,
} from './constants';
```

Keep `import { useState } from 'react';` and `import { Alert } from 'react-native';` and `import { createHand } from './api';`.

- [ ] **Step 3: Update `NewHandForm.tsx` to import from `./constants`**

`NewHandForm.tsx` currently imports `POSITIONS`, `STREETS`, `fmt`, `type Street` from `./useHandForm`. Update those imports to come from `./constants` instead (cleaner — removes reliance on re-exports):

Find the import line in `NewHandForm.tsx`:
```ts
import { POSITIONS, STREETS, fmt, type Street, ... } from './useHandForm';
```
Change it to:
```ts
import { POSITIONS, STREETS, fmt, type Street, ... } from './constants';
```

Keep any other imports from `./useHandForm` (the hook itself and other hook-specific exports) unchanged.

- [ ] **Step 4: Remove interface/type definitions from `api.ts`**

Delete the interface block (lines 3–51, everything from `export interface PokerSession` through `export interface PokerStats`).

Add import at the top of `api.ts` (after the existing imports):

```ts
export type {
  PokerSession,
  PokerHandSummary,
  PokerHand,
  PokerAction,
  PokerStats,
} from './constants';
```

The `export type { ... } from './constants'` re-exports so existing imports of these types from `./api` continue to work — no changes needed to files that currently import from `api.ts`.

- [ ] **Step 5: TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```sh
git add frontend/src/sub-apps/poker-tracker/constants.ts \
        frontend/src/sub-apps/poker-tracker/useHandForm.ts \
        frontend/src/sub-apps/poker-tracker/api.ts \
        frontend/src/sub-apps/poker-tracker/NewHandForm.tsx
git commit -m "refactor: extract poker constants and types to constants.ts"
```

---

### Task 7: Rename PokerHome.tsx → PokerTrackerNavigator.tsx

**Files:**
- Rename: `frontend/src/sub-apps/poker-tracker/PokerHome.tsx` → `frontend/src/sub-apps/poker-tracker/PokerTrackerNavigator.tsx`
- Modify: `frontend/src/sub-apps/registry.ts`

The file is a tab navigator component, not a "home screen". The name misleads both humans and AI agents.

- [ ] **Step 1: Rename the file and update the component name**

Copy content to the new filename. In the new file, rename the exported function from `PokerHome` to `PokerTrackerNavigator`:

Change:
```tsx
export default function PokerHome({ slug: _ }: Props) {
```
To:
```tsx
export default function PokerTrackerNavigator({ slug: _ }: Props) {
```

- [ ] **Step 2: Update registry.ts import**

In `frontend/src/sub-apps/registry.ts`:

Replace:
```ts
import PokerHome from './poker-tracker/PokerHome';
```
With:
```ts
import PokerTrackerNavigator from './poker-tracker/PokerTrackerNavigator';
```

And in the registry object:
```ts
'poker-tracker': PokerTrackerNavigator,
```

- [ ] **Step 3: Delete the old file**

```sh
rm /home/user/Playground/frontend/src/sub-apps/poker-tracker/PokerHome.tsx
```

- [ ] **Step 4: TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```sh
git add frontend/src/sub-apps/registry.ts \
        frontend/src/sub-apps/poker-tracker/PokerTrackerNavigator.tsx
git rm frontend/src/sub-apps/poker-tracker/PokerHome.tsx
git commit -m "refactor: rename PokerHome → PokerTrackerNavigator"
```

---

### Task 8: Add sub-app workflow comment to registry.ts

**Files:**
- Modify: `frontend/src/sub-apps/registry.ts`

The registry is the right place to document the full add-a-sub-app pattern, including the backend step that developers easily miss.

- [ ] **Step 1: Add comment block to registry.ts**

Insert before `const registry`:

```ts
// ─── Sub-app registry ────────────────────────────────────────────────────────
//
// To add a new sub-app:
//   1. Create component in src/sub-apps/<slug>/  (entry: <Name>.tsx)
//   2. Register it here: '<slug>': YourComponent
//   3. Backend: add a row to db/seeds.rb (find_or_create_by! slug: '<slug>')
//      and run `bin/rails db:seed` in production (or deploy with enabled: false first)
//
```

- [ ] **Step 2: Commit**

```sh
git add frontend/src/sub-apps/registry.ts
git commit -m "docs: add sub-app addition workflow comment to registry.ts"
```

---

### Task 9: Final verification

- [ ] **Step 1: TypeScript check (full)**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Rails boot check**

```sh
cd /home/user/Playground/backend
mise exec -- bin/rails runner "puts 'OK'"
```

Expected: `OK`

- [ ] **Step 3: Confirm all 9 tasks committed**

```sh
git log --oneline -10
```

Expected: at least 8 commits visible (Tasks 1-8 each produce one commit; Task 4 may have 2 due to backend + frontend changes).

- [ ] **Step 4: Push to feature branch**

```sh
git push -u origin claude/app-structure-evaluation-GaKdG
```
