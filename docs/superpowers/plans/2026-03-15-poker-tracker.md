# Poker Tracker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a poker session and hand tracking sub-app in the Playground platform, with a Rails backend and React Native/Expo frontend.

**Architecture:** Three Rails models (PokerSession, PokerHand, PokerAction) with nested routes under `/api/v1/poker/`. Frontend is a React Native sub-app with bottom tab navigation, registered in the existing Playground sub-app registry.

**Tech Stack:** Rails 8.1 (Minitest), React Native / Expo SDK 54, TypeScript, React Navigation (stack + bottom tabs), react-native-chart-kit + react-native-svg for charts.

---

## File Map

### Backend (new files)
- `backend/db/migrate/20260316000001_create_poker_sessions.rb`
- `backend/db/migrate/20260316000002_create_poker_hands.rb`
- `backend/db/migrate/20260316000003_create_poker_actions.rb`
- `backend/app/models/poker_session.rb`
- `backend/app/models/poker_hand.rb`
- `backend/app/models/poker_action.rb`
- `backend/app/controllers/api/v1/poker/sessions_controller.rb`
- `backend/app/controllers/api/v1/poker/hands_controller.rb`
- `backend/app/controllers/api/v1/poker/actions_controller.rb`
- `backend/app/controllers/api/v1/poker/stats_controller.rb`
- `backend/test/test_helper.rb` (create — no test dir exists yet)
- `backend/test/models/poker_session_test.rb`
- `backend/test/models/poker_hand_test.rb`
- `backend/test/models/poker_action_test.rb`
- `backend/test/controllers/api/v1/poker/sessions_controller_test.rb`
- `backend/test/controllers/api/v1/poker/hands_controller_test.rb`
- `backend/test/controllers/api/v1/poker/actions_controller_test.rb`
- `backend/test/controllers/api/v1/poker/stats_controller_test.rb`

### Backend (modified files)
- `backend/config/routes.rb` — add poker namespace + nested routes
- `backend/db/seeds.rb` — add sample poker sessions/hands

### Frontend (new files)
- `frontend/src/sub-apps/poker-tracker/types.ts`
- `frontend/src/sub-apps/poker-tracker/api.ts`
- `frontend/src/sub-apps/poker-tracker/index.tsx` — root PokerHome (bottom tabs)
- `frontend/src/sub-apps/poker-tracker/screens/SessionList.tsx`
- `frontend/src/sub-apps/poker-tracker/screens/NewSessionForm.tsx`
- `frontend/src/sub-apps/poker-tracker/screens/SessionDetail.tsx`
- `frontend/src/sub-apps/poker-tracker/screens/NewHandForm.tsx`
- `frontend/src/sub-apps/poker-tracker/screens/HandDetail.tsx`
- `frontend/src/sub-apps/poker-tracker/screens/AllHandsList.tsx`
- `frontend/src/sub-apps/poker-tracker/screens/StatsScreen.tsx`

### Frontend (modified files)
- `frontend/src/sub-apps/registry.ts` — register `poker-tracker`
- `frontend/package.json` — add @react-navigation/bottom-tabs, react-native-svg, react-native-chart-kit

---

## Chunk 1: Backend Models & Migrations

### Task 1: Test Infrastructure

**Files:**
- Create: `backend/test/test_helper.rb`

- [ ] **Step 1: Create test helper**

```ruby
# backend/test/test_helper.rb
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActiveSupport::TestCase
  fixtures :all
end
```

- [ ] **Step 2: Create test directory structure**

```bash
mkdir -p backend/test/models
mkdir -p backend/test/controllers/api/v1/poker
```

- [ ] **Step 3: Verify Rails test runs (nothing to test yet)**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test
```
Expected: `0 runs, 0 assertions, 0 failures, 0 errors, 0 skips`

---

### Task 2: PokerSession Migration + Model

**Files:**
- Create: `backend/db/migrate/20260316000001_create_poker_sessions.rb`
- Create: `backend/app/models/poker_session.rb`
- Create: `backend/test/models/poker_session_test.rb`

- [ ] **Step 1: Write the failing test**

```ruby
# backend/test/models/poker_session_test.rb
require "test_helper"

class PokerSessionTest < ActiveSupport::TestCase
  test "valid with required fields" do
    session = PokerSession.new(date: Date.today, buy_in_cents: 20000, cash_out_cents: 25000)
    assert session.valid?
  end

  test "requires date" do
    session = PokerSession.new(buy_in_cents: 20000, cash_out_cents: 25000)
    assert_not session.valid?
    assert_includes session.errors[:date], "can't be blank"
  end

  test "requires buy_in_cents" do
    session = PokerSession.new(date: Date.today, cash_out_cents: 25000)
    assert_not session.valid?
    assert_includes session.errors[:buy_in_cents], "can't be blank"
  end

  test "requires cash_out_cents" do
    session = PokerSession.new(date: Date.today, buy_in_cents: 20000)
    assert_not session.valid?
    assert_includes session.errors[:cash_out_cents], "can't be blank"
  end

  test "optional fields are valid when nil" do
    session = PokerSession.new(date: Date.today, buy_in_cents: 20000, cash_out_cents: 25000,
                               location: nil, game_type: nil, stakes: nil, duration_minutes: nil)
    assert session.valid?
  end

  test "profit_cents computed correctly" do
    session = PokerSession.new(date: Date.today, buy_in_cents: 20000, cash_out_cents: 25000)
    assert_equal 5000, session.profit_cents
  end

  test "profit_cents is negative for a loss" do
    session = PokerSession.new(date: Date.today, buy_in_cents: 20000, cash_out_cents: 15000)
    assert_equal(-5000, session.profit_cents)
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test test/models/poker_session_test.rb
```
Expected: Error — `uninitialized constant PokerSession`

- [ ] **Step 3: Create migration**

```ruby
# backend/db/migrate/20260316000001_create_poker_sessions.rb
class CreatePokerSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :poker_sessions do |t|
      t.date :date, null: false
      t.integer :buy_in_cents, null: false
      t.integer :cash_out_cents, null: false
      t.string :location
      t.string :game_type
      t.string :stakes
      t.integer :duration_minutes
      t.timestamps
    end
  end
end
```

- [ ] **Step 4: Create model**

```ruby
# backend/app/models/poker_session.rb
class PokerSession < ApplicationRecord
  has_many :poker_hands, dependent: :destroy

  validates :date, presence: true
  validates :buy_in_cents, presence: true, numericality: { only_integer: true }
  validates :cash_out_cents, presence: true, numericality: { only_integer: true }

  def profit_cents
    cash_out_cents - buy_in_cents
  end
end
```

- [ ] **Step 5: Run migration**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails db:migrate
```

- [ ] **Step 6: Run tests — expect all pass**

```bash
mise exec -- bin/rails test test/models/poker_session_test.rb
```
Expected: `7 runs, 7 assertions, 0 failures, 0 errors, 0 skips`

- [ ] **Step 7: Commit**

```bash
git add backend/db/migrate/20260316000001_create_poker_sessions.rb backend/app/models/poker_session.rb backend/test/test_helper.rb backend/test/models/poker_session_test.rb
git commit -m "feat(backend): add PokerSession model, migration, and tests"
```

---

### Task 3: PokerHand Migration + Model

**Files:**
- Create: `backend/db/migrate/20260316000002_create_poker_hands.rb`
- Create: `backend/app/models/poker_hand.rb`
- Create: `backend/test/models/poker_hand_test.rb`

- [ ] **Step 1: Write failing test**

```ruby
# backend/test/models/poker_hand_test.rb
require "test_helper"

class PokerHandTest < ActiveSupport::TestCase
  def setup
    @session = PokerSession.create!(date: Date.today, buy_in_cents: 20000, cash_out_cents: 25000)
  end

  test "valid with no required fields (all optional)" do
    hand = PokerHand.new(poker_session: @session)
    assert hand.valid?
  end

  test "hero_position must be valid enum value or nil" do
    hand = PokerHand.new(poker_session: @session, hero_position: "BTN")
    assert hand.valid?
  end

  test "rejects invalid hero_position" do
    assert_raises(ArgumentError) do
      PokerHand.new(poker_session: @session, hero_position: "INVALID")
    end
  end

  test "all valid hero_position values accepted" do
    %w[BTN CO MP UTG SB BB].each do |pos|
      hand = PokerHand.new(poker_session: @session, hero_position: pos)
      assert hand.valid?, "Expected #{pos} to be valid"
    end
  end

  test "belongs to a session" do
    hand = PokerHand.create!(poker_session: @session)
    assert_equal @session, hand.poker_session
  end

  test "destroyed when session destroyed" do
    hand = PokerHand.create!(poker_session: @session)
    hand_id = hand.id
    @session.destroy
    assert_not PokerHand.exists?(hand_id)
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test test/models/poker_hand_test.rb
```
Expected: Error — `uninitialized constant PokerHand`

- [ ] **Step 3: Create migration**

```ruby
# backend/db/migrate/20260316000002_create_poker_hands.rb
class CreatePokerHands < ActiveRecord::Migration[8.1]
  def change
    create_table :poker_hands do |t|
      t.references :poker_session, null: false, foreign_key: true
      t.string :hero_cards
      t.integer :hero_position
      t.integer :effective_stack_cents
      t.integer :pot_result_cents
      t.text :notes
      t.timestamps
    end
  end
end
```

- [ ] **Step 4: Create model**

```ruby
# backend/app/models/poker_hand.rb
class PokerHand < ApplicationRecord
  belongs_to :poker_session
  has_many :poker_actions, dependent: :destroy

  accepts_nested_attributes_for :poker_actions

  POSITIONS = %w[BTN CO MP UTG SB BB].freeze

  enum :hero_position, { "BTN" => 0, "CO" => 1, "MP" => 2, "UTG" => 3, "SB" => 4, "BB" => 5 }
end
```

- [ ] **Step 5: Run migration**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails db:migrate
```

- [ ] **Step 6: Run tests — expect all pass**

```bash
mise exec -- bin/rails test test/models/poker_hand_test.rb
```
Expected: `6 runs, 8 assertions, 0 failures, 0 errors, 0 skips`

- [ ] **Step 7: Commit**

```bash
git add backend/db/migrate/20260316000002_create_poker_hands.rb backend/app/models/poker_hand.rb backend/test/models/poker_hand_test.rb
git commit -m "feat(backend): add PokerHand model, migration, and tests"
```

---

### Task 4: PokerAction Migration + Model

**Files:**
- Create: `backend/db/migrate/20260316000003_create_poker_actions.rb`
- Create: `backend/app/models/poker_action.rb`
- Create: `backend/test/models/poker_action_test.rb`

- [ ] **Step 1: Write failing test**

```ruby
# backend/test/models/poker_action_test.rb
require "test_helper"

class PokerActionTest < ActiveSupport::TestCase
  def setup
    session = PokerSession.create!(date: Date.today, buy_in_cents: 20000, cash_out_cents: 25000)
    @hand = PokerHand.create!(poker_session: session)
  end

  test "valid hero action with required fields" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "hero",
                             action_type: "raise", amount_cents: 600, sequence: 1)
    assert action.valid?
  end

  test "valid villain action with villain_position" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "villain",
                             villain_position: "BB", action_type: "call", amount_cents: 600, sequence: 2)
    assert action.valid?
  end

  test "requires street" do
    action = PokerAction.new(poker_hand: @hand, actor: "hero", action_type: "fold", sequence: 1)
    assert_not action.valid?
    assert_includes action.errors[:street], "can't be blank"
  end

  test "requires actor" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", action_type: "fold", sequence: 1)
    assert_not action.valid?
    assert_includes action.errors[:actor], "can't be blank"
  end

  test "requires action_type" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "hero", sequence: 1)
    assert_not action.valid?
    assert_includes action.errors[:action_type], "can't be blank"
  end

  test "requires sequence" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "hero", action_type: "fold")
    assert_not action.valid?
    assert_includes action.errors[:sequence], "can't be blank"
  end

  test "requires villain_position when actor is villain" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "villain",
                             action_type: "call", amount_cents: 600, sequence: 2)
    assert_not action.valid?
    assert_includes action.errors[:villain_position], "can't be blank"
  end

  test "villain_position not required when actor is hero" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "hero",
                             action_type: "bet", amount_cents: 400, sequence: 1)
    assert action.valid?
  end

  test "amount_cents must be positive when present" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "hero",
                             action_type: "bet", amount_cents: 0, sequence: 1)
    assert_not action.valid?
    assert_includes action.errors[:amount_cents], "must be greater than 0"
  end

  test "amount_cents can be nil for fold" do
    action = PokerAction.new(poker_hand: @hand, street: "preflop", actor: "hero",
                             action_type: "fold", amount_cents: nil, sequence: 1)
    assert action.valid?
  end

  test "destroyed when hand destroyed" do
    action = PokerAction.create!(poker_hand: @hand, street: "preflop", actor: "hero",
                                  action_type: "fold", sequence: 1)
    action_id = action.id
    @hand.destroy
    assert_not PokerAction.exists?(action_id)
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test test/models/poker_action_test.rb
```
Expected: Error — `uninitialized constant PokerAction`

- [ ] **Step 3: Create migration**

```ruby
# backend/db/migrate/20260316000003_create_poker_actions.rb
class CreatePokerActions < ActiveRecord::Migration[8.1]
  def change
    create_table :poker_actions do |t|
      t.references :poker_hand, null: false, foreign_key: true
      t.integer :street, null: false
      t.integer :actor, null: false
      t.integer :villain_position
      t.integer :action_type, null: false
      t.integer :amount_cents
      t.integer :sequence, null: false
      t.timestamps
    end
  end
end
```

- [ ] **Step 4: Create model**

```ruby
# backend/app/models/poker_action.rb
class PokerAction < ApplicationRecord
  belongs_to :poker_hand

  enum :street, { "preflop" => 0, "flop" => 1, "turn" => 2, "river" => 3 }
  enum :actor, { "hero" => 0, "villain" => 1 }
  enum :action_type, { "fold" => 0, "check" => 1, "call" => 2, "bet" => 3, "raise" => 4 }
  enum :villain_position, { "BTN" => 0, "CO" => 1, "MP" => 2, "UTG" => 3, "SB" => 4, "BB" => 5 },
       prefix: :villain_pos

  validates :street, presence: true
  validates :actor, presence: true
  validates :action_type, presence: true
  validates :sequence, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :villain_position, presence: true, if: -> { actor == "villain" }
  validates :amount_cents, numericality: { greater_than: 0 }, allow_nil: true
end
```

- [ ] **Step 5: Run migration**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails db:migrate
```

- [ ] **Step 6: Run tests — expect all pass**

```bash
mise exec -- bin/rails test test/models/poker_action_test.rb
```
Expected: `11 runs, 13 assertions, 0 failures, 0 errors, 0 skips`

- [ ] **Step 7: Run all model tests together**

```bash
mise exec -- bin/rails test test/models/
```
Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add backend/db/migrate/20260316000003_create_poker_actions.rb backend/app/models/poker_action.rb backend/test/models/poker_action_test.rb
git commit -m "feat(backend): add PokerAction model, migration, and tests"
```

---

## Chunk 2: Backend Controllers & Routes

### Task 5: Routes Configuration

**Files:**
- Modify: `backend/config/routes.rb`

- [ ] **Step 1: Update routes**

```ruby
# backend/config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :sub_apps, only: [:index]

      namespace :poker do
        resources :sessions do
          resources :hands do
            resources :actions, only: [:create, :update, :destroy]
          end
        end
        resources :hands, only: [:index]
        get "stats", to: "stats#index"
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
```

- [ ] **Step 2: Verify routes generated correctly**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails routes | grep poker
```
Expected: You should see routes for sessions, hands, actions, and stats under `/api/v1/poker/`.

- [ ] **Step 3: Commit**

```bash
git add backend/config/routes.rb
git commit -m "feat(backend): add poker API routes"
```

---

### Task 6: Sessions Controller

**Files:**
- Create: `backend/app/controllers/api/v1/poker/sessions_controller.rb`
- Create: `backend/test/controllers/api/v1/poker/sessions_controller_test.rb`

- [ ] **Step 1: Write failing controller tests**

```ruby
# backend/test/controllers/api/v1/poker/sessions_controller_test.rb
require "test_helper"

class Api::V1::Poker::SessionsControllerTest < ActionDispatch::IntegrationTest
  def setup
    @session = PokerSession.create!(
      date: "2026-03-15", buy_in_cents: 20000, cash_out_cents: 25000,
      location: "Commerce Casino", stakes: "1/2"
    )
  end

  test "GET /api/v1/poker/sessions returns sessions with profit_cents" do
    get "/api/v1/poker/sessions"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body.length
    assert_equal @session.id, body[0]["id"]
    assert_equal 5000, body[0]["profit_cents"]
    assert_equal "2026-03-15", body[0]["date"]
  end

  test "GET /api/v1/poker/sessions returns sessions ordered by date desc" do
    older = PokerSession.create!(date: "2026-03-01", buy_in_cents: 10000, cash_out_cents: 10000)
    get "/api/v1/poker/sessions"
    body = JSON.parse(response.body)
    assert_equal @session.id, body[0]["id"]
    assert_equal older.id, body[1]["id"]
  end

  test "POST /api/v1/poker/sessions creates a session" do
    post "/api/v1/poker/sessions", params: {
      poker_session: { date: "2026-03-16", buy_in_cents: 30000, cash_out_cents: 35000, stakes: "2/5" }
    }, as: :json
    assert_response :created
    body = JSON.parse(response.body)
    assert_equal 5000, body["profit_cents"]
    assert_equal "2/5", body["stakes"]
  end

  test "POST /api/v1/poker/sessions returns errors for invalid params" do
    post "/api/v1/poker/sessions", params: {
      poker_session: { buy_in_cents: 30000, cash_out_cents: 35000 }
    }, as: :json
    assert_response :unprocessable_entity
    body = JSON.parse(response.body)
    assert body["errors"].present?
  end

  test "GET /api/v1/poker/sessions/:id returns session with hands" do
    hand = PokerHand.create!(poker_session: @session, hero_cards: "Ah Kd", hero_position: "BTN")
    get "/api/v1/poker/sessions/#{@session.id}"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal @session.id, body["id"]
    assert_equal 5000, body["profit_cents"]
    assert_equal 1, body["hands"].length
    assert_equal "Ah Kd", body["hands"][0]["hero_cards"]
  end

  test "GET /api/v1/poker/sessions/:id returns 404 for missing session" do
    get "/api/v1/poker/sessions/99999"
    assert_response :not_found
  end

  test "PATCH /api/v1/poker/sessions/:id updates the session" do
    patch "/api/v1/poker/sessions/#{@session.id}", params: {
      poker_session: { location: "Bicycle Casino" }
    }, as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "Bicycle Casino", body["location"]
  end

  test "DELETE /api/v1/poker/sessions/:id destroys session and hands" do
    hand = PokerHand.create!(poker_session: @session)
    delete "/api/v1/poker/sessions/#{@session.id}"
    assert_response :no_content
    assert_not PokerSession.exists?(@session.id)
    assert_not PokerHand.exists?(hand.id)
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test test/controllers/api/v1/poker/sessions_controller_test.rb
```
Expected: Routing error — controller doesn't exist yet.

- [ ] **Step 3: Create sessions controller**

```ruby
# backend/app/controllers/api/v1/poker/sessions_controller.rb
module Api
  module V1
    module Poker
      class SessionsController < ApplicationController
        before_action :set_session, only: [:show, :update, :destroy]

        def index
          sessions = PokerSession.order(date: :desc)
          render json: sessions.map { |s| session_json(s) }
        end

        def show
          render json: session_json(@poker_session, include_hands: true)
        end

        def create
          session = PokerSession.new(session_params)
          if session.save
            render json: session_json(session), status: :created
          else
            render json: { errors: session.errors }, status: :unprocessable_entity
          end
        end

        def update
          if @poker_session.update(session_params)
            render json: session_json(@poker_session)
          else
            render json: { errors: @poker_session.errors }, status: :unprocessable_entity
          end
        end

        def destroy
          @poker_session.destroy
          head :no_content
        end

        private

        def set_session
          @poker_session = PokerSession.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Session not found" }, status: :not_found
        end

        def session_params
          params.require(:poker_session).permit(
            :date, :buy_in_cents, :cash_out_cents, :location, :game_type, :stakes, :duration_minutes
          )
        end

        def session_json(session, include_hands: false)
          json = session.as_json(only: [:id, :date, :buy_in_cents, :cash_out_cents,
                                        :location, :game_type, :stakes, :duration_minutes])
          json["profit_cents"] = session.profit_cents
          if include_hands
            json["hands"] = session.poker_hands.as_json(
              only: [:id, :hero_cards, :hero_position, :pot_result_cents]
            )
          end
          json
        end
      end
    end
  end
end
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
mise exec -- bin/rails test test/controllers/api/v1/poker/sessions_controller_test.rb
```
Expected: `8 runs, N assertions, 0 failures, 0 errors, 0 skips`

- [ ] **Step 5: Commit**

```bash
git add backend/app/controllers/api/v1/poker/sessions_controller.rb backend/test/controllers/api/v1/poker/sessions_controller_test.rb
git commit -m "feat(backend): add Sessions controller with CRUD endpoints"
```

---

### Task 7: Hands Controller

**Files:**
- Create: `backend/app/controllers/api/v1/poker/hands_controller.rb`
- Create: `backend/test/controllers/api/v1/poker/hands_controller_test.rb`

- [ ] **Step 1: Write failing tests**

```ruby
# backend/test/controllers/api/v1/poker/hands_controller_test.rb
require "test_helper"

class Api::V1::Poker::HandsControllerTest < ActionDispatch::IntegrationTest
  def setup
    @session = PokerSession.create!(
      date: "2026-03-15", buy_in_cents: 20000, cash_out_cents: 25000, stakes: "1/2"
    )
    @hand = PokerHand.create!(
      poker_session: @session, hero_cards: "Ah Kd", hero_position: "BTN", pot_result_cents: 5000
    )
  end

  test "GET /api/v1/poker/hands returns all hands with session context" do
    get "/api/v1/poker/hands"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body.length
    assert_equal @hand.id, body[0]["id"]
    assert_equal "Ah Kd", body[0]["hero_cards"]
    assert_not_nil body[0]["session"]
    assert_equal @session.id, body[0]["session"]["id"]
    assert_equal "1/2", body[0]["session"]["stakes"]
  end

  test "GET /api/v1/poker/sessions/:id/hands returns hands for session" do
    get "/api/v1/poker/sessions/#{@session.id}/hands"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body.length
    assert_equal @hand.id, body[0]["id"]
  end

  test "GET /api/v1/poker/sessions/:id/hands/:id returns hand with actions" do
    action = PokerAction.create!(
      poker_hand: @hand, street: "preflop", actor: "hero",
      action_type: "raise", amount_cents: 600, sequence: 1
    )
    get "/api/v1/poker/sessions/#{@session.id}/hands/#{@hand.id}"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal @hand.id, body["id"]
    assert_equal 1, body["actions"].length
    assert_equal "preflop", body["actions"][0]["street"]
    assert_equal "raise", body["actions"][0]["action_type"]
  end

  test "POST /api/v1/poker/sessions/:id/hands creates hand with nested actions" do
    post "/api/v1/poker/sessions/#{@session.id}/hands", params: {
      poker_hand: {
        hero_cards: "Qs Jd",
        hero_position: "CO",
        effective_stack_cents: 20000,
        pot_result_cents: -800,
        notes: "Tough spot",
        poker_actions_attributes: [
          { street: "preflop", actor: "hero", action_type: "raise", amount_cents: 600, sequence: 1 },
          { street: "preflop", actor: "villain", villain_position: "BB", action_type: "call", amount_cents: 600, sequence: 2 },
          { street: "flop", actor: "hero", action_type: "bet", amount_cents: 800, sequence: 3 },
          { street: "flop", actor: "villain", villain_position: "BB", action_type: "raise", amount_cents: 2400, sequence: 4 },
          { street: "flop", actor: "hero", action_type: "fold", sequence: 5 }
        ]
      }
    }, as: :json
    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "Qs Jd", body["hero_cards"]
    assert_equal 5, body["actions"].length
  end

  test "DELETE /api/v1/poker/sessions/:id/hands/:id destroys hand and actions" do
    action = PokerAction.create!(
      poker_hand: @hand, street: "preflop", actor: "hero", action_type: "fold", sequence: 1
    )
    delete "/api/v1/poker/sessions/#{@session.id}/hands/#{@hand.id}"
    assert_response :no_content
    assert_not PokerHand.exists?(@hand.id)
    assert_not PokerAction.exists?(action.id)
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test test/controllers/api/v1/poker/hands_controller_test.rb
```
Expected: Routing or constant error.

- [ ] **Step 3: Create hands controller**

```ruby
# backend/app/controllers/api/v1/poker/hands_controller.rb
module Api
  module V1
    module Poker
      class HandsController < ApplicationController
        before_action :set_session, only: [:index, :show, :create, :update, :destroy]
        before_action :set_hand, only: [:show, :update, :destroy]

        # GET /api/v1/poker/hands — all hands across all sessions
        def index
          if params[:session_id]
            hands = @poker_session.poker_hands.order(created_at: :desc)
            render json: hands.map { |h| hand_summary_json(h) }
          else
            hands = PokerHand.includes(:poker_session).order(created_at: :desc)
            render json: hands.map { |h| hand_with_session_json(h) }
          end
        end

        def show
          render json: hand_detail_json(@hand)
        end

        def create
          hand = @poker_session.poker_hands.new(hand_params)
          if hand.save
            render json: hand_detail_json(hand), status: :created
          else
            render json: { errors: hand.errors }, status: :unprocessable_entity
          end
        end

        def update
          if @hand.update(hand_update_params)
            render json: hand_detail_json(@hand)
          else
            render json: { errors: @hand.errors }, status: :unprocessable_entity
          end
        end

        def destroy
          @hand.destroy
          head :no_content
        end

        private

        def set_session
          if params[:session_id]
            @poker_session = PokerSession.find(params[:session_id])
          end
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Session not found" }, status: :not_found
        end

        def set_hand
          @hand = @poker_session.poker_hands.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Hand not found" }, status: :not_found
        end

        def hand_params
          params.require(:poker_hand).permit(
            :hero_cards, :hero_position, :effective_stack_cents, :pot_result_cents, :notes,
            poker_actions_attributes: [:street, :actor, :villain_position, :action_type, :amount_cents, :sequence]
          )
        end

        def hand_update_params
          params.require(:poker_hand).permit(
            :hero_cards, :hero_position, :effective_stack_cents, :pot_result_cents, :notes
          )
        end

        def hand_summary_json(hand)
          hand.as_json(only: [:id, :hero_cards, :hero_position, :pot_result_cents])
        end

        def hand_with_session_json(hand)
          json = hand.as_json(only: [:id, :hero_cards, :hero_position, :pot_result_cents])
          json["session"] = hand.poker_session.as_json(only: [:id, :date, :stakes])
          json
        end

        def hand_detail_json(hand)
          json = hand.as_json(only: [:id, :session_id, :hero_cards, :hero_position,
                                     :effective_stack_cents, :pot_result_cents, :notes])
          json["session_id"] = hand.poker_session_id
          actions = hand.poker_actions.order(:street, :sequence)
          json["actions"] = actions.as_json(
            only: [:id, :street, :actor, :villain_position, :action_type, :amount_cents, :sequence]
          )
          json
        end
      end
    end
  end
end
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
mise exec -- bin/rails test test/controllers/api/v1/poker/hands_controller_test.rb
```
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/controllers/api/v1/poker/hands_controller.rb backend/test/controllers/api/v1/poker/hands_controller_test.rb
git commit -m "feat(backend): add Hands controller with nested creation support"
```

---

### Task 8: Actions Controller

**Files:**
- Create: `backend/app/controllers/api/v1/poker/actions_controller.rb`
- Create: `backend/test/controllers/api/v1/poker/actions_controller_test.rb`

- [ ] **Step 1: Write failing tests**

```ruby
# backend/test/controllers/api/v1/poker/actions_controller_test.rb
require "test_helper"

class Api::V1::Poker::ActionsControllerTest < ActionDispatch::IntegrationTest
  def setup
    @session = PokerSession.create!(date: "2026-03-15", buy_in_cents: 20000, cash_out_cents: 25000)
    @hand = PokerHand.create!(poker_session: @session)
    @action = PokerAction.create!(
      poker_hand: @hand, street: "preflop", actor: "hero",
      action_type: "raise", amount_cents: 600, sequence: 1
    )
  end

  test "POST creates a new action" do
    post "/api/v1/poker/sessions/#{@session.id}/hands/#{@hand.id}/actions", params: {
      poker_action: { street: "flop", actor: "hero", action_type: "bet", amount_cents: 800, sequence: 2 }
    }, as: :json
    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "flop", body["street"]
    assert_equal 800, body["amount_cents"]
  end

  test "POST returns errors for invalid action" do
    post "/api/v1/poker/sessions/#{@session.id}/hands/#{@hand.id}/actions", params: {
      poker_action: { street: "preflop", actor: "villain", action_type: "call", amount_cents: 600, sequence: 3 }
    }, as: :json
    assert_response :unprocessable_entity
  end

  test "PATCH updates an action" do
    patch "/api/v1/poker/sessions/#{@session.id}/hands/#{@hand.id}/actions/#{@action.id}", params: {
      poker_action: { amount_cents: 800 }
    }, as: :json
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 800, body["amount_cents"]
  end

  test "DELETE destroys an action" do
    delete "/api/v1/poker/sessions/#{@session.id}/hands/#{@hand.id}/actions/#{@action.id}"
    assert_response :no_content
    assert_not PokerAction.exists?(@action.id)
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test test/controllers/api/v1/poker/actions_controller_test.rb
```

- [ ] **Step 3: Create actions controller**

```ruby
# backend/app/controllers/api/v1/poker/actions_controller.rb
module Api
  module V1
    module Poker
      class ActionsController < ApplicationController
        before_action :set_hand
        before_action :set_action, only: [:update, :destroy]

        def create
          action = @hand.poker_actions.new(action_params)
          if action.save
            render json: action_json(action), status: :created
          else
            render json: { errors: action.errors }, status: :unprocessable_entity
          end
        end

        def update
          if @action.update(action_params)
            render json: action_json(@action)
          else
            render json: { errors: @action.errors }, status: :unprocessable_entity
          end
        end

        def destroy
          @action.destroy
          head :no_content
        end

        private

        def set_hand
          @session = PokerSession.find(params[:session_id])
          @hand = @session.poker_hands.find(params[:hand_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Not found" }, status: :not_found
        end

        def set_action
          @action = @hand.poker_actions.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Action not found" }, status: :not_found
        end

        def action_params
          params.require(:poker_action).permit(
            :street, :actor, :villain_position, :action_type, :amount_cents, :sequence
          )
        end

        def action_json(action)
          action.as_json(only: [:id, :street, :actor, :villain_position, :action_type, :amount_cents, :sequence])
        end
      end
    end
  end
end
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
mise exec -- bin/rails test test/controllers/api/v1/poker/actions_controller_test.rb
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/controllers/api/v1/poker/actions_controller.rb backend/test/controllers/api/v1/poker/actions_controller_test.rb
git commit -m "feat(backend): add Actions controller for at-table quick capture"
```

---

### Task 9: Stats Controller

**Files:**
- Create: `backend/app/controllers/api/v1/poker/stats_controller.rb`
- Create: `backend/test/controllers/api/v1/poker/stats_controller_test.rb`

- [ ] **Step 1: Write failing tests**

```ruby
# backend/test/controllers/api/v1/poker/stats_controller_test.rb
require "test_helper"

class Api::V1::Poker::StatsControllerTest < ActionDispatch::IntegrationTest
  def setup
    s1 = PokerSession.create!(date: "2026-03-10", buy_in_cents: 20000, cash_out_cents: 17000)
    s2 = PokerSession.create!(date: "2026-03-15", buy_in_cents: 20000, cash_out_cents: 25000)
    PokerHand.create!(poker_session: s1, hero_position: "BTN", pot_result_cents: -800)
    PokerHand.create!(poker_session: s1, hero_position: "BTN", pot_result_cents: 1200)
    PokerHand.create!(poker_session: s2, hero_position: "CO", pot_result_cents: 5000)
    PokerHand.create!(poker_session: s2, hero_position: "CO", pot_result_cents: -500)
    PokerHand.create!(poker_session: s2, hero_position: "BTN", pot_result_cents: nil)
  end

  test "GET /api/v1/poker/stats returns correct totals" do
    get "/api/v1/poker/stats"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 2, body["session_count"]
    assert_equal 2000, body["total_profit_cents"]   # -3000 + 5000
    assert_equal 1000, body["avg_profit_per_session_cents"]
  end

  test "GET /api/v1/poker/stats returns profit_by_date ordered by date asc" do
    get "/api/v1/poker/stats"
    body = JSON.parse(response.body)
    dates = body["profit_by_date"].map { |d| d["date"] }
    assert_equal dates.sort, dates
    assert_equal(-3000, body["profit_by_date"][0]["profit_cents"])
    assert_equal 5000, body["profit_by_date"][1]["profit_cents"]
  end

  test "GET /api/v1/poker/stats returns win_rate_by_position" do
    get "/api/v1/poker/stats"
    body = JSON.parse(response.body)
    rates = body["win_rate_by_position"]
    # BTN: 1 win out of 2 hands with result = 0.5 (null hand excluded)
    assert_equal 0.5, rates["BTN"]
    # CO: 1 win out of 2 = 0.5
    assert_equal 0.5, rates["CO"]
  end

  test "GET /api/v1/poker/stats handles no sessions" do
    PokerSession.destroy_all
    get "/api/v1/poker/stats"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 0, body["session_count"]
    assert_equal 0, body["total_profit_cents"]
    assert_equal 0, body["avg_profit_per_session_cents"]
    assert_equal [], body["profit_by_date"]
    assert_equal({}, body["win_rate_by_position"])
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test test/controllers/api/v1/poker/stats_controller_test.rb
```

- [ ] **Step 3: Create stats controller**

```ruby
# backend/app/controllers/api/v1/poker/stats_controller.rb
module Api
  module V1
    module Poker
      class StatsController < ApplicationController
        def index
          sessions = PokerSession.all
          session_count = sessions.count
          total_profit = sessions.sum("cash_out_cents - buy_in_cents")

          profit_by_date = sessions.order(:date).map do |s|
            { date: s.date.to_s, profit_cents: s.profit_cents }
          end

          hands_with_result = PokerHand.where.not(pot_result_cents: nil).where.not(hero_position: nil)
          win_rate_by_position = {}
          hands_with_result.group_by(&:hero_position).each do |pos, hands|
            wins = hands.count { |h| h.pot_result_cents > 0 }
            win_rate_by_position[pos] = (wins.to_f / hands.size).round(2)
          end

          render json: {
            total_profit_cents: total_profit,
            session_count: session_count,
            avg_profit_per_session_cents: session_count > 0 ? (total_profit.to_f / session_count).round : 0,
            profit_by_date: profit_by_date,
            win_rate_by_position: win_rate_by_position
          }
        end
      end
    end
  end
end
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
mise exec -- bin/rails test test/controllers/api/v1/poker/stats_controller_test.rb
```

- [ ] **Step 5: Run full test suite**

```bash
mise exec -- bin/rails test
```
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/controllers/api/v1/poker/stats_controller.rb backend/test/controllers/api/v1/poker/stats_controller_test.rb
git commit -m "feat(backend): add Stats controller with profit and position analytics"
```

---

## Chunk 3: Frontend Setup

### Task 10: Install Frontend Dependencies

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install bottom tabs navigation**

```bash
cd /home/user/Playground/frontend
mise exec -- npm install @react-navigation/bottom-tabs
```

- [ ] **Step 2: Install react-native-svg (use expo install for SDK compatibility)**

```bash
cd /home/user/Playground/frontend
mise exec -- npx expo install react-native-svg
```

- [ ] **Step 3: Install react-native-chart-kit**

```bash
cd /home/user/Playground/frontend
mise exec -- npm install react-native-chart-kit
```

- [ ] **Step 4: Verify TypeScript still compiles**

```bash
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Commit updated package files**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add bottom-tabs, react-native-svg, and chart-kit dependencies"
```

---

### Task 11: Types

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// frontend/src/sub-apps/poker-tracker/types.ts

export type Position = 'BTN' | 'CO' | 'MP' | 'UTG' | 'SB' | 'BB';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Actor = 'hero' | 'villain';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export interface PokerSession {
  id: number;
  date: string;
  buy_in_cents: number;
  cash_out_cents: number;
  profit_cents: number;
  location: string | null;
  game_type: string | null;
  stakes: string | null;
  duration_minutes: number | null;
}

export interface PokerSessionDetail extends PokerSession {
  hands: PokerHandSummary[];
}

export interface PokerHandSummary {
  id: number;
  hero_cards: string | null;
  hero_position: Position | null;
  pot_result_cents: number | null;
}

export interface PokerHand {
  id: number;
  session_id: number;
  hero_cards: string | null;
  hero_position: Position | null;
  effective_stack_cents: number | null;
  pot_result_cents: number | null;
  notes: string | null;
  actions: PokerAction[];
}

export interface PokerHandWithSession extends PokerHandSummary {
  session: {
    id: number;
    date: string;
    stakes: string | null;
  };
}

export interface PokerAction {
  id: number;
  street: Street;
  actor: Actor;
  villain_position: Position | null;
  action_type: ActionType;
  amount_cents: number | null;
  sequence: number;
}

export interface NewActionInput {
  street: Street;
  actor: Actor;
  villain_position: Position | null;
  action_type: ActionType;
  amount_cents: number | null;
  sequence: number;
}

export interface PokerStats {
  total_profit_cents: number;
  session_count: number;
  avg_profit_per_session_cents: number;
  profit_by_date: { date: string; profit_cents: number }[];
  win_rate_by_position: Partial<Record<Position, number>>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/types.ts
git commit -m "feat(frontend): add poker tracker TypeScript types"
```

---

### Task 12: API Client

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/api.ts`

- [ ] **Step 1: Create API client**

```typescript
// frontend/src/sub-apps/poker-tracker/api.ts
import {
  PokerSession,
  PokerSessionDetail,
  PokerHand,
  PokerHandWithSession,
  PokerAction,
  PokerStats,
  NewActionInput,
} from './types';

const BASE_URL = 'https://playground-api-dyu9.onrender.com/api/v1/poker';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

// Sessions
export const fetchSessions = () => request<PokerSession[]>('/sessions');

export const fetchSession = (id: number) =>
  request<PokerSessionDetail>(`/sessions/${id}`);

export const createSession = (data: Omit<PokerSession, 'id' | 'profit_cents'>) =>
  request<PokerSession>('/sessions', { method: 'POST', body: JSON.stringify({ poker_session: data }) });

export const updateSession = (id: number, data: Partial<Omit<PokerSession, 'id' | 'profit_cents'>>) =>
  request<PokerSession>(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ poker_session: data }) });

export const deleteSession = (id: number) =>
  request<void>(`/sessions/${id}`, { method: 'DELETE' });

// Hands
export const fetchAllHands = () => request<PokerHandWithSession[]>('/hands');

export const fetchHand = (sessionId: number, handId: number) =>
  request<PokerHand>(`/sessions/${sessionId}/hands/${handId}`);

export const createHand = (
  sessionId: number,
  data: {
    hero_cards?: string;
    hero_position?: string;
    effective_stack_cents?: number;
    pot_result_cents?: number;
    notes?: string;
    poker_actions_attributes?: NewActionInput[];
  }
) =>
  request<PokerHand>(`/sessions/${sessionId}/hands`, {
    method: 'POST',
    body: JSON.stringify({ poker_hand: data }),
  });

export const deleteHand = (sessionId: number, handId: number) =>
  request<void>(`/sessions/${sessionId}/hands/${handId}`, { method: 'DELETE' });

// Actions
export const createAction = (sessionId: number, handId: number, data: NewActionInput) =>
  request<PokerAction>(`/sessions/${sessionId}/hands/${handId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ poker_action: data }),
  });

export const deleteAction = (sessionId: number, handId: number, actionId: number) =>
  request<void>(`/sessions/${sessionId}/hands/${handId}/actions/${actionId}`, { method: 'DELETE' });

// Stats
export const fetchStats = () => request<PokerStats>('/stats');
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/api.ts
git commit -m "feat(frontend): add poker tracker API client"
```

---

## Chunk 4: Frontend Sessions Screens

### Shared Helper: Currency Formatting

All screens use these helpers inline (define once in a `utils.ts` if needed, but inline for now):

```typescript
// Format cents to dollars: 5000 → "$50.00"
const formatCents = (cents: number): string =>
  `$${(Math.abs(cents) / 100).toFixed(2)}`;

// Format profit with sign and color
const profitColor = (cents: number): string => (cents >= 0 ? '#16a34a' : '#dc2626');
const profitLabel = (cents: number): string =>
  `${cents >= 0 ? '+' : '-'}${formatCents(cents)}`;
```

---

### Task 13: SessionList Screen

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/screens/SessionList.tsx`

- [ ] **Step 1: Create SessionList component**

```tsx
// frontend/src/sub-apps/poker-tracker/screens/SessionList.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchSessions, deleteSession } from '../api';
import { PokerSession } from '../types';
import { SessionsStackParamList } from '../index';

type Nav = NativeStackNavigationProp<SessionsStackParamList, 'SessionList'>;

export default function SessionList() {
  const navigation = useNavigation<Nav>();
  const [sessions, setSessions] = useState<PokerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (session: PokerSession) => {
    Alert.alert('Delete Session', `Delete session on ${session.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteSession(session.id);
          setSessions(prev => prev.filter(s => s.id !== session.id));
        }
      }
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#166534" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={s => String(s.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No sessions yet. Tap + to add one.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
            onLongPress={() => handleDelete(item)}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.meta}>
                {[item.stakes, item.location].filter(Boolean).join(' · ') || 'No details'}
              </Text>
            </View>
            <Text style={[styles.profit, { color: item.profit_cents >= 0 ? '#16a34a' : '#dc2626' }]}>
              {item.profit_cents >= 0 ? '+' : ''}{(item.profit_cents / 100).toFixed(0)}
            </Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewSession')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 60, fontSize: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  rowLeft: { flex: 1 },
  date: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  profit: { fontSize: 20, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Note: Will show errors about missing types in `index.tsx` until Task 20. That's expected at this stage — check that poker-tracker-specific errors are not present.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/screens/SessionList.tsx
git commit -m "feat(frontend): add SessionList screen"
```

---

### Task 14: NewSessionForm Screen

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/screens/NewSessionForm.tsx`

- [ ] **Step 1: Create NewSessionForm component**

```tsx
// frontend/src/sub-apps/poker-tracker/screens/NewSessionForm.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createSession } from '../api';

export default function NewSessionForm() {
  const navigation = useNavigation();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [location, setLocation] = useState('');
  const [gameType, setGameType] = useState("NL Hold'em");
  const [stakes, setStakes] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date || !buyIn || !cashOut) {
      Alert.alert('Required Fields', 'Date, buy-in, and cash-out are required.');
      return;
    }
    const buyInCents = Math.round(parseFloat(buyIn) * 100);
    const cashOutCents = Math.round(parseFloat(cashOut) * 100);
    if (isNaN(buyInCents) || isNaN(cashOutCents)) {
      Alert.alert('Invalid Input', 'Buy-in and cash-out must be numbers.');
      return;
    }
    const durationMinutes = durationHours || durationMins
      ? (parseInt(durationHours || '0') * 60) + parseInt(durationMins || '0')
      : undefined;

    setSaving(true);
    try {
      await createSession({
        date,
        buy_in_cents: buyInCents,
        cash_out_cents: cashOutCents,
        location: location || null,
        game_type: gameType || null,
        stakes: stakes || null,
        duration_minutes: durationMinutes ?? null,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <Text style={styles.label}>Buy-in ($) <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={buyIn} onChangeText={setBuyIn}
          keyboardType="decimal-pad" placeholder="200.00" />

        <Text style={styles.label}>Cash-out ($) <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={cashOut} onChangeText={setCashOut}
          keyboardType="decimal-pad" placeholder="250.00" />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation}
          placeholder="Commerce Casino" />

        <Text style={styles.label}>Game Type</Text>
        <TextInput style={styles.input} value={gameType} onChangeText={setGameType}
          placeholder="NL Hold'em" />

        <Text style={styles.label}>Stakes</Text>
        <TextInput style={styles.input} value={stakes} onChangeText={setStakes} placeholder="1/2" />

        <Text style={styles.label}>Duration</Text>
        <View style={styles.durationRow}>
          <TextInput style={[styles.input, styles.durationInput]} value={durationHours}
            onChangeText={setDurationHours} keyboardType="number-pad" placeholder="2h" />
          <TextInput style={[styles.input, styles.durationInput]} value={durationMins}
            onChangeText={setDurationMins} keyboardType="number-pad" placeholder="30m" />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Session</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  required: { color: '#dc2626' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1fae5',
    borderRadius: 8, padding: 12, fontSize: 16, color: '#111827',
  },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationInput: { flex: 1 },
  saveBtn: {
    backgroundColor: '#16a34a', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/screens/NewSessionForm.tsx
git commit -m "feat(frontend): add NewSessionForm screen"
```

---

### Task 15: SessionDetail Screen

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/screens/SessionDetail.tsx`

- [ ] **Step 1: Create SessionDetail component**

```tsx
// frontend/src/sub-apps/poker-tracker/screens/SessionDetail.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchSession, deleteHand } from '../api';
import { PokerSessionDetail, PokerHandSummary } from '../types';
import { SessionsStackParamList } from '../index';

type Props = NativeStackScreenProps<SessionsStackParamList, 'SessionDetail'>;
type Nav = NativeStackNavigationProp<SessionsStackParamList, 'SessionDetail'>;

function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SessionDetail({ route }: Props) {
  const navigation = useNavigation<Nav>();
  const { sessionId } = route.params;
  const [session, setSession] = useState<PokerSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchSession(sessionId);
      setSession(data);
    } catch {
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDeleteHand = (hand: PokerHandSummary) => {
    Alert.alert('Delete Hand?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteHand(sessionId, hand.id);
          setSession(prev => prev ? { ...prev, hands: prev.hands.filter(h => h.id !== hand.id) } : prev);
        }
      }
    ]);
  };

  if (loading || !session) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#166534" />;

  const profitColor = session.profit_cents >= 0 ? '#16a34a' : '#dc2626';

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Session summary header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Buy-in</Text>
              <Text style={styles.statValue}>${(session.buy_in_cents / 100).toFixed(0)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Cash-out</Text>
              <Text style={styles.statValue}>${(session.cash_out_cents / 100).toFixed(0)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Profit</Text>
              <Text style={[styles.statValue, { color: profitColor }]}>
                {session.profit_cents >= 0 ? '+' : ''}${(session.profit_cents / 100).toFixed(0)}
              </Text>
            </View>
          </View>
          {session.duration_minutes ? (
            <Text style={styles.meta}>Duration: {formatDuration(session.duration_minutes)}</Text>
          ) : null}
        </View>

        {/* Hands list */}
        <View style={styles.handsSection}>
          <Text style={styles.sectionTitle}>Hands ({session.hands.length})</Text>
          {session.hands.length === 0 && (
            <Text style={styles.empty}>No hands recorded yet.</Text>
          )}
          {session.hands.map(hand => (
            <TouchableOpacity
              key={hand.id}
              style={styles.handRow}
              onPress={() => navigation.navigate('HandDetail', { sessionId, handId: hand.id })}
              onLongPress={() => handleDeleteHand(hand)}
            >
              <Text style={styles.handCards}>{hand.hero_cards || '?? ??'}</Text>
              <Text style={styles.handPos}>{hand.hero_position || '—'}</Text>
              {hand.pot_result_cents != null ? (
                <Text style={[styles.handResult, {
                  color: hand.pot_result_cents >= 0 ? '#16a34a' : '#dc2626'
                }]}>
                  {hand.pot_result_cents >= 0 ? '+' : ''}${(hand.pot_result_cents / 100).toFixed(0)}
                </Text>
              ) : <Text style={styles.handResult}>—</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewHand', { sessionId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { backgroundColor: '#fff', padding: 20, margin: 16, borderRadius: 12, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { textAlign: 'center', color: '#6b7280', marginTop: 8 },
  handsSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 8 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  handRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, elevation: 1,
  },
  handCards: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 },
  handPos: { fontSize: 14, color: '#6b7280', marginHorizontal: 8 },
  handResult: { fontSize: 16, fontWeight: '600', minWidth: 50, textAlign: 'right' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/screens/SessionDetail.tsx
git commit -m "feat(frontend): add SessionDetail screen"
```

---

## Chunk 5: Frontend Hands, NewHandForm & Stats

### Task 16: NewHandForm Screen

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/screens/NewHandForm.tsx`

- [ ] **Step 1: Create NewHandForm component**

```tsx
// frontend/src/sub-apps/poker-tracker/screens/NewHandForm.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createHand } from '../api';
import { Position, Street, Actor, ActionType, NewActionInput } from '../types';
import { SessionsStackParamList } from '../index';

type Props = NativeStackScreenProps<SessionsStackParamList, 'NewHand'>;

const POSITIONS: Position[] = ['BTN', 'CO', 'MP', 'UTG', 'SB', 'BB'];
const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const ACTION_TYPES: ActionType[] = ['fold', 'check', 'call', 'bet', 'raise'];

function ChipSelector<T extends string>({
  options, value, onChange, label,
}: { options: T[]; value: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={cs.chipLabel}>{label}</Text>
      <View style={cs.chipRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[cs.chip, value === opt && cs.chipSelected]}
            onPress={() => onChange(opt)}
          >
            <Text style={[cs.chipText, value === opt && cs.chipTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  chipLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#d1fae5', backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
});

export default function NewHandForm({ route }: Props) {
  const navigation = useNavigation();
  const { sessionId } = route.params;

  const [heroCards, setHeroCards] = useState('');
  const [heroPosition, setHeroPosition] = useState<Position | null>(null);
  const [effectiveStack, setEffectiveStack] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [actions, setActions] = useState<Omit<NewActionInput, 'sequence'>[]>([]);
  const [saving, setSaving] = useState(false);

  const addAction = () => {
    setActions(prev => [...prev, {
      street: 'preflop', actor: 'hero', villain_position: null,
      action_type: 'fold', amount_cents: null,
    }]);
  };

  const updateAction = (index: number, patch: Partial<Omit<NewActionInput, 'sequence'>>) => {
    setActions(prev => prev.map((a, i) => i === index ? { ...a, ...patch } : a));
  };

  const removeAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const effectiveStackCents = effectiveStack ? Math.round(parseFloat(effectiveStack) * 100) : undefined;
      const potResultCents = result ? Math.round(parseFloat(result) * 100) : undefined;

      const actionsWithSequence: NewActionInput[] = actions.map((a, i) => ({ ...a, sequence: i + 1 }));

      // Validate villain actions have position
      const invalidVillain = actionsWithSequence.find(a => a.actor === 'villain' && !a.villain_position);
      if (invalidVillain) {
        Alert.alert('Missing Position', 'All villain actions require a position.');
        setSaving(false);
        return;
      }

      await createHand(sessionId, {
        hero_cards: heroCards || undefined,
        hero_position: heroPosition || undefined,
        effective_stack_cents: effectiveStackCents,
        pot_result_cents: potResultCents,
        notes: notes || undefined,
        poker_actions_attributes: actionsWithSequence,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save hand.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Hero Cards</Text>
        <TextInput style={styles.input} value={heroCards} onChangeText={setHeroCards}
          placeholder="Ah Kd" autoCapitalize="none" />

        <ChipSelector options={POSITIONS} value={heroPosition} onChange={setHeroPosition} label="Hero Position" />

        <Text style={styles.label}>Effective Stack ($)</Text>
        <TextInput style={styles.input} value={effectiveStack} onChangeText={setEffectiveStack}
          keyboardType="decimal-pad" placeholder="200.00" />

        <Text style={styles.label}>Result ($, negative for loss)</Text>
        <TextInput style={styles.input} value={result} onChangeText={setResult}
          keyboardType="numbers-and-punctuation" placeholder="-8.00 or 50.00" />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes}
          multiline placeholder="Hand notes..." />

        <Text style={styles.sectionTitle}>Actions</Text>
        {actions.map((action, index) => (
          <View key={index} style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <Text style={styles.actionNum}>Action {index + 1}</Text>
              <TouchableOpacity onPress={() => removeAction(index)}>
                <Text style={styles.removeBtn}>Remove</Text>
              </TouchableOpacity>
            </View>
            <ChipSelector options={STREETS} value={action.street} label="Street"
              onChange={v => updateAction(index, { street: v })} />
            <ChipSelector options={['hero', 'villain'] as Actor[]} value={action.actor} label="Actor"
              onChange={v => updateAction(index, { actor: v, villain_position: null })} />
            {action.actor === 'villain' && (
              <ChipSelector options={POSITIONS} value={action.villain_position} label="Villain Position"
                onChange={v => updateAction(index, { villain_position: v })} />
            )}
            <ChipSelector options={ACTION_TYPES} value={action.action_type} label="Action"
              onChange={v => updateAction(index, { action_type: v, amount_cents: v === 'fold' || v === 'check' ? null : action.amount_cents })} />
            {(action.action_type === 'bet' || action.action_type === 'raise' || action.action_type === 'call') && (
              <>
                <Text style={cs.chipLabel}>Amount ($)</Text>
                <TextInput style={styles.input} keyboardType="decimal-pad"
                  placeholder="6.00"
                  onChangeText={v => updateAction(index, { amount_cents: v ? Math.round(parseFloat(v) * 100) : null })} />
              </>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addActionBtn} onPress={addAction}>
          <Text style={styles.addActionText}>+ Add Action</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Hand</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1fae5',
    borderRadius: 8, padding: 12, fontSize: 16, color: '#111827', marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#166534', marginTop: 20, marginBottom: 8 },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#d1fae5',
  },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  actionNum: { fontWeight: '600', color: '#374151' },
  removeBtn: { color: '#dc2626', fontSize: 13 },
  addActionBtn: {
    borderWidth: 2, borderColor: '#16a34a', borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16,
  },
  addActionText: { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  saveBtn: { backgroundColor: '#16a34a', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/screens/NewHandForm.tsx
git commit -m "feat(frontend): add NewHandForm screen with inline action builder"
```

---

### Task 17: HandDetail Screen

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/screens/HandDetail.tsx`

- [ ] **Step 1: Create HandDetail component**

```tsx
// frontend/src/sub-apps/poker-tracker/screens/HandDetail.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchHand } from '../api';
import { PokerHand, Street } from '../types';
import { SessionsStackParamList } from '../index';

type Props = NativeStackScreenProps<SessionsStackParamList, 'HandDetail'>;

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

export default function HandDetail({ route }: Props) {
  const { sessionId, handId } = route.params;
  const [hand, setHand] = useState<PokerHand | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    fetchHand(sessionId, handId)
      .then(setHand)
      .catch(() => Alert.alert('Error', 'Failed to load hand'))
      .finally(() => setLoading(false));
  }, [sessionId, handId]));

  if (loading || !hand) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#166534" />;

  const profitColor = hand.pot_result_cents != null
    ? (hand.pot_result_cents >= 0 ? '#16a34a' : '#dc2626')
    : '#6b7280';

  const actionsByStreet = STREET_ORDER.map(street => ({
    street,
    actions: hand.actions.filter(a => a.street === street).sort((a, b) => a.sequence - b.sequence),
  })).filter(g => g.actions.length > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero info */}
      <View style={styles.heroCard}>
        <Text style={styles.cards}>{hand.hero_cards || '?? ??'}</Text>
        {hand.hero_position && <Text style={styles.position}>{hand.hero_position}</Text>}
        {hand.effective_stack_cents && (
          <Text style={styles.meta}>Stack: ${(hand.effective_stack_cents / 100).toFixed(0)}</Text>
        )}
      </View>

      {/* Actions by street */}
      {actionsByStreet.map(({ street, actions }) => (
        <View key={street} style={styles.streetSection}>
          <Text style={styles.streetLabel}>{street.toUpperCase()}</Text>
          {actions.map(action => (
            <View key={action.id} style={styles.actionRow}>
              <Text style={[styles.actor, action.actor === 'hero' ? styles.heroActor : styles.villainActor]}>
                {action.actor === 'hero' ? 'Hero' : `Villain (${action.villain_position})`}
              </Text>
              <Text style={styles.actionType}>{action.action_type}</Text>
              {action.amount_cents && (
                <Text style={styles.amount}>${(action.amount_cents / 100).toFixed(0)}</Text>
              )}
            </View>
          ))}
        </View>
      ))}

      {/* Result */}
      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>Result</Text>
        <Text style={[styles.resultValue, { color: profitColor }]}>
          {hand.pot_result_cents != null
            ? `${hand.pot_result_cents >= 0 ? '+' : ''}$${(hand.pot_result_cents / 100).toFixed(0)}`
            : 'Not recorded'}
        </Text>
      </View>

      {/* Notes */}
      {hand.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{hand.notes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 16 },
  heroCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  cards: { fontSize: 32, fontWeight: '700', color: '#111827', letterSpacing: 4 },
  position: { fontSize: 18, color: '#166534', marginTop: 4 },
  meta: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  streetSection: { marginBottom: 12 },
  streetLabel: { fontSize: 12, fontWeight: '700', color: '#166534', letterSpacing: 1, marginBottom: 6 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, padding: 10, marginBottom: 4, gap: 8, elevation: 1,
  },
  actor: { fontSize: 14, fontWeight: '600', flex: 1 },
  heroActor: { color: '#1d4ed8' },
  villainActor: { color: '#9333ea' },
  actionType: { fontSize: 14, color: '#374151', textTransform: 'capitalize' },
  amount: { fontSize: 14, color: '#374151', fontWeight: '600' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, elevation: 2,
  },
  resultLabel: { fontSize: 15, color: '#6b7280' },
  resultValue: { fontSize: 22, fontWeight: '700' },
  notesCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12, elevation: 1 },
  notesLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 4 },
  notesText: { fontSize: 15, color: '#374151', lineHeight: 22 },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/screens/HandDetail.tsx
git commit -m "feat(frontend): add HandDetail screen"
```

---

### Task 18: AllHandsList Screen

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/screens/AllHandsList.tsx`

- [ ] **Step 1: Create AllHandsList component**

```tsx
// frontend/src/sub-apps/poker-tracker/screens/AllHandsList.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchAllHands } from '../api';
import { PokerHandWithSession, Position } from '../types';
import { HandsStackParamList } from '../index';

type Nav = NativeStackNavigationProp<HandsStackParamList, 'AllHandsList'>;

type Filter = { position: Position | 'all'; result: 'all' | 'won' | 'lost' };

const POSITIONS: (Position | 'all')[] = ['all', 'BTN', 'CO', 'MP', 'UTG', 'SB', 'BB'];

export default function AllHandsList() {
  const navigation = useNavigation<Nav>();
  const [hands, setHands] = useState<PokerHandWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>({ position: 'all', result: 'all' });

  const load = useCallback(async () => {
    try {
      const data = await fetchAllHands();
      setHands(data);
    } catch {
      Alert.alert('Error', 'Failed to load hands');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    return hands.filter(h => {
      if (filter.position !== 'all' && h.hero_position !== filter.position) return false;
      if (filter.result === 'won' && (h.pot_result_cents == null || h.pot_result_cents <= 0)) return false;
      if (filter.result === 'lost' && (h.pot_result_cents == null || h.pot_result_cents >= 0)) return false;
      return true;
    });
  }, [hands, filter]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#166534" />;

  return (
    <View style={styles.container}>
      {/* Position filter */}
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={POSITIONS}
          keyExtractor={p => p}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter.position === item && styles.filterChipActive]}
              onPress={() => setFilter(f => ({ ...f, position: item }))}
            >
              <Text style={[styles.filterText, filter.position === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
        <View style={styles.resultFilter}>
          {(['all', 'won', 'lost'] as const).map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.filterChip, filter.result === r && styles.filterChipActive]}
              onPress={() => setFilter(f => ({ ...f, result: r }))}
            >
              <Text style={[styles.filterText, filter.result === r && styles.filterTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={h => String(h.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No hands match the current filter.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('HandDetail', { sessionId: item.session.id, handId: item.id })}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.cards}>{item.hero_cards || '?? ??'}</Text>
              <Text style={styles.meta}>
                {item.hero_position || '—'} · {item.session.date}
                {item.session.stakes ? ` · ${item.session.stakes}` : ''}
              </Text>
            </View>
            {item.pot_result_cents != null ? (
              <Text style={[styles.result, { color: item.pot_result_cents >= 0 ? '#16a34a' : '#dc2626' }]}>
                {item.pot_result_cents >= 0 ? '+' : ''}${(item.pot_result_cents / 100).toFixed(0)}
              </Text>
            ) : <Text style={styles.result}>—</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  filters: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  resultFilter: { flexDirection: 'row', gap: 6, marginTop: 6 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#d1fae5', marginRight: 6,
  },
  filterChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { fontSize: 13, color: '#374151' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 60 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 14, marginHorizontal: 16, marginTop: 10, borderRadius: 10, elevation: 1,
  },
  rowLeft: { flex: 1 },
  cards: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  result: { fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/screens/AllHandsList.tsx
git commit -m "feat(frontend): add AllHandsList screen with position and result filters"
```

---

### Task 19: StatsScreen

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/screens/StatsScreen.tsx`

- [ ] **Step 1: Create StatsScreen component**

```tsx
// frontend/src/sub-apps/poker-tracker/screens/StatsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { fetchStats } from '../api';
import { PokerStats } from '../types';

const { width: screenWidth } = Dimensions.get('window');

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
  labelColor: () => '#6b7280',
  strokeWidth: 2,
  propsForDots: { r: '3', strokeWidth: '1', stroke: '#16a34a' },
};

export default function StatsScreen() {
  const [stats, setStats] = useState<PokerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    fetchStats()
      .then(setStats)
      .catch(() => Alert.alert('Error', 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []));

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#166534" />;
  if (!stats) return null;

  const profitColor = stats.total_profit_cents >= 0 ? '#16a34a' : '#dc2626';

  // Build cumulative profit data for line chart
  const cumulativeData: number[] = [];
  let running = 0;
  stats.profit_by_date.forEach(d => {
    running += d.profit_cents;
    cumulativeData.push(running / 100); // convert to dollars
  });

  const lineChartData = {
    labels: stats.profit_by_date.map(d => d.date.slice(5)), // MM-DD
    datasets: [{ data: cumulativeData.length > 0 ? cumulativeData : [0] }],
  };

  // Win rate bar chart
  const positions = Object.keys(stats.win_rate_by_position);
  const barChartData = {
    labels: positions,
    datasets: [{ data: positions.map(p => (stats.win_rate_by_position as Record<string, number>)[p] * 100) }],
  };

  const chartWidth = screenWidth - 48;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total P&L</Text>
          <Text style={[styles.summaryValue, { color: profitColor }]}>
            {stats.total_profit_cents >= 0 ? '+' : ''}${(stats.total_profit_cents / 100).toFixed(0)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Sessions</Text>
          <Text style={styles.summaryValue}>{stats.session_count}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg/Session</Text>
          <Text style={[styles.summaryValue, {
            color: stats.avg_profit_per_session_cents >= 0 ? '#16a34a' : '#dc2626'
          }]}>
            {stats.avg_profit_per_session_cents >= 0 ? '+' : ''}${(stats.avg_profit_per_session_cents / 100).toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Cumulative profit chart */}
      {cumulativeData.length > 1 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Cumulative P&L Over Time</Text>
          <LineChart
            data={lineChartData}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            formatYLabel={v => `$${parseInt(v)}`}
            hidePointsAtIndex={lineChartData.labels.length > 10
              ? lineChartData.labels.map((_, i) => i).filter(i => i % 2 !== 0)
              : []}
          />
        </View>
      )}

      {/* Win rate by position */}
      {positions.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Win Rate by Position</Text>
          <BarChart
            data={barChartData}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix="%"
            fromZero
          />
        </View>
      )}

      {stats.session_count === 0 && (
        <Text style={styles.empty}>No session data yet. Add some sessions to see stats.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  chartSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  chartTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 },
  chart: { borderRadius: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/screens/StatsScreen.tsx
git commit -m "feat(frontend): add StatsScreen with cumulative P&L and win rate charts"
```

---

## Chunk 6: Integration

### Task 20: PokerHome Root Component (Bottom Tab Navigator)

**Files:**
- Create: `frontend/src/sub-apps/poker-tracker/index.tsx`

- [ ] **Step 1: Create PokerHome with stacked bottom tab navigation**

```tsx
// frontend/src/sub-apps/poker-tracker/index.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SessionList from './screens/SessionList';
import NewSessionForm from './screens/NewSessionForm';
import SessionDetail from './screens/SessionDetail';
import NewHandForm from './screens/NewHandForm';
import HandDetail from './screens/HandDetail';
import AllHandsList from './screens/AllHandsList';
import StatsScreen from './screens/StatsScreen';

// --- Param lists (exported so screens can import them) ---

export type SessionsStackParamList = {
  SessionList: undefined;
  NewSession: undefined;
  SessionDetail: { sessionId: number };
  NewHand: { sessionId: number };
  HandDetail: { sessionId: number; handId: number };
};

export type HandsStackParamList = {
  AllHandsList: undefined;
  HandDetail: { sessionId: number; handId: number };
};

// --- Stacks ---

const SessionsStack = createNativeStackNavigator<SessionsStackParamList>();
function SessionsNavigator() {
  return (
    <SessionsStack.Navigator screenOptions={{ headerTintColor: '#166534', headerBackTitle: '' }}>
      <SessionsStack.Screen name="SessionList" component={SessionList} options={{ title: 'Sessions' }} />
      <SessionsStack.Screen name="NewSession" component={NewSessionForm} options={{ title: 'New Session' }} />
      <SessionsStack.Screen name="SessionDetail" component={SessionDetail} options={{ title: 'Session' }} />
      <SessionsStack.Screen name="NewHand" component={NewHandForm} options={{ title: 'Log Hand' }} />
      <SessionsStack.Screen name="HandDetail" component={HandDetail} options={{ title: 'Hand' }} />
    </SessionsStack.Navigator>
  );
}

const HandsStack = createNativeStackNavigator<HandsStackParamList>();
function HandsNavigator() {
  return (
    <HandsStack.Navigator screenOptions={{ headerTintColor: '#166534', headerBackTitle: '' }}>
      <HandsStack.Screen name="AllHandsList" component={AllHandsList} options={{ title: 'All Hands' }} />
      <HandsStack.Screen name="HandDetail" component={HandDetail} options={{ title: 'Hand' }} />
    </HandsStack.Navigator>
  );
}

// --- Bottom Tabs ---

const Tab = createBottomTabNavigator();

export default function PokerHome({ slug }: { slug: string }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e5e7eb' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Sessions: 'calendar-outline',
            Hands: 'hand-left-outline',
            Stats: 'stats-chart-outline',
          };
          return <Ionicons name={(icons[route.name] ?? 'ellipse-outline') as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Sessions" component={SessionsNavigator} />
      <Tab.Screen name="Hands" component={HandsNavigator} />
      <Tab.Screen name="Stats" component={StatsScreen}
        options={{ headerShown: true, headerTitle: 'Stats', headerTintColor: '#166534' }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/sub-apps/poker-tracker/index.tsx
git commit -m "feat(frontend): add PokerHome root component with bottom tab navigation"
```

---

### Task 21: Register Poker Tracker in Registry

**Files:**
- Modify: `frontend/src/sub-apps/registry.ts`

- [ ] **Step 1: Add poker-tracker to registry**

Edit `frontend/src/sub-apps/registry.ts`:

```typescript
import React from 'react';
import HelloWorldApp from './hello-world/HelloWorldApp';
import PokerHome from './poker-tracker/index';

type SubAppComponent = React.ComponentType<{ slug: string }>;

const registry: Record<string, SubAppComponent> = {
  'hello-world': HelloWorldApp,
  'poker-tracker': PokerHome,
};

export function getSubAppComponent(slug: string): SubAppComponent | null {
  return registry[slug] ?? null;
}

export function isSubAppAvailable(slug: string): boolean {
  return slug in registry;
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/sub-apps/registry.ts
git commit -m "feat(frontend): register poker-tracker sub-app in registry"
```

---

### Task 22: Backend Seed Data + SubApp Record

**Files:**
- Modify: `backend/db/seeds.rb`

- [ ] **Step 1: Add seed data**

```ruby
# backend/db/seeds.rb (add to existing file or replace)

# Ensure poker-tracker sub-app exists
SubApp.find_or_create_by!(slug: 'poker-tracker') do |app|
  app.name = 'Poker Tracker'
  app.description = 'Track poker sessions, hands, and stats'
  app.icon = 'card-outline'
  app.color = '#166534'
  app.position = 2
  app.enabled = true
end

# Sample poker data (only seed if no sessions exist)
if PokerSession.none?
  s1 = PokerSession.create!(
    date: '2026-03-10', buy_in_cents: 20000, cash_out_cents: 17000,
    location: 'Commerce Casino', game_type: "NL Hold'em", stakes: '1/2', duration_minutes: 180
  )
  s2 = PokerSession.create!(
    date: '2026-03-15', buy_in_cents: 20000, cash_out_cents: 25000,
    location: 'Bicycle Casino', game_type: "NL Hold'em", stakes: '1/2', duration_minutes: 240
  )

  h1 = PokerHand.create!(
    poker_session: s1, hero_cards: 'Ah Kd', hero_position: 'BTN',
    effective_stack_cents: 20000, pot_result_cents: -800, notes: 'C-bet got raised on flop'
  )
  PokerAction.create!([
    { poker_hand: h1, street: 'preflop', actor: 'hero', action_type: 'raise', amount_cents: 600, sequence: 1 },
    { poker_hand: h1, street: 'preflop', actor: 'villain', villain_position: 'BB', action_type: 'call', amount_cents: 600, sequence: 2 },
    { poker_hand: h1, street: 'flop', actor: 'hero', action_type: 'bet', amount_cents: 600, sequence: 3 },
    { poker_hand: h1, street: 'flop', actor: 'villain', villain_position: 'BB', action_type: 'raise', amount_cents: 1800, sequence: 4 },
    { poker_hand: h1, street: 'flop', actor: 'hero', action_type: 'fold', sequence: 5 },
  ])

  h2 = PokerHand.create!(
    poker_session: s2, hero_cards: 'Qs Jd', hero_position: 'CO',
    effective_stack_cents: 25000, pot_result_cents: 4800
  )
  PokerAction.create!([
    { poker_hand: h2, street: 'preflop', actor: 'hero', action_type: 'raise', amount_cents: 600, sequence: 1 },
    { poker_hand: h2, street: 'preflop', actor: 'villain', villain_position: 'BTN', action_type: 'call', amount_cents: 600, sequence: 2 },
    { poker_hand: h2, street: 'flop', actor: 'hero', action_type: 'bet', amount_cents: 800, sequence: 3 },
    { poker_hand: h2, street: 'flop', actor: 'villain', villain_position: 'BTN', action_type: 'fold', sequence: 4 },
  ])
end

puts "Seed complete."
```

- [ ] **Step 2: Run seeds**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails db:seed
```
Expected: `Seed complete.`

- [ ] **Step 3: Commit**

```bash
git add backend/db/seeds.rb
git commit -m "feat(backend): add poker tracker seed data and SubApp record"
```

---

### Task 23: Final Verification

- [ ] **Step 1: Run full backend test suite**

```bash
cd /home/user/Playground/backend
mise exec -- bin/rails test
```
Expected: All tests pass, 0 failures, 0 errors.

- [ ] **Step 2: Final TypeScript check**

```bash
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Push to feature branch**

```bash
git push -u origin claude/poker-tracking-app-Blfsy
```

- [ ] **Step 4: Deploy backend and push EAS update**

Deploy backend (trigger via git push or Render hook). Then push OTA update:

```bash
cd /home/user/Playground/frontend
mise exec -- npx eas update --branch preview --message "Add poker tracker sub-app" --environment preview --non-interactive
```

---

