# GraphQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all REST API endpoints with a single GraphQL endpoint on the Rails backend and update the React Native frontend to use Apollo Client.

**Architecture:** The backend adds `graphql-ruby`, defines types/queries/mutations covering SubApps and all Poker resources, mounts `/graphql`, and removes all `/api/v1/` REST routes. The frontend swaps `src/api/client.ts` and `src/sub-apps/poker-tracker/api.ts` for Apollo Client with inline `gql` queries/mutations, keeping all UI screens unchanged.

**Tech Stack:** graphql-ruby 2.x, @apollo/client 3.x, graphql (npm), Minitest (backend tests), TypeScript

> **graphql-ruby field naming:** Fields defined as `field :hero_position` are automatically camelized to `heroPosition` in the SDL and can be queried as `heroPosition`. This is the default behaviour — no extra configuration needed. Mutation arguments wrapped in `input: {}` are also the graphql-ruby default when inheriting from `GraphQL::Schema::Mutation`. `GraphQL::Types::JSON` is built into the gem — no extra gem required.

---

## File Map

### Backend — files to create

| Path | Responsibility |
|------|---------------|
| `backend/app/graphql/playground_schema.rb` | Root schema class wiring QueryType + MutationType |
| `backend/app/graphql/types/base_object.rb` | Base class for all object types |
| `backend/app/graphql/types/base_argument.rb` | Base class for arguments |
| `backend/app/graphql/types/base_field.rb` | Base class for fields |
| `backend/app/graphql/types/base_input_object.rb` | Base class for input types |
| `backend/app/graphql/types/base_mutation.rb` | Base class for mutations |
| `backend/app/graphql/types/base_enum.rb` | Base class for enums |
| `backend/app/graphql/types/base_scalar.rb` | Base class for scalars |
| `backend/app/graphql/types/query_type.rb` | All root queries |
| `backend/app/graphql/types/mutation_type.rb` | All root mutations |
| `backend/app/graphql/types/sub_app_type.rb` | SubApp fields |
| `backend/app/graphql/types/poker_session_type.rb` | PokerSession fields + nested hands |
| `backend/app/graphql/types/poker_hand_type.rb` | PokerHand fields + nested actions |
| `backend/app/graphql/types/poker_action_type.rb` | PokerAction fields |
| `backend/app/graphql/types/poker_stats_type.rb` | Stats aggregate type |
| `backend/app/graphql/types/profit_by_date_type.rb` | Nested profit_by_date entry |
| `backend/app/graphql/mutations/base_mutation.rb` | Shared mutation base |
| `backend/app/graphql/mutations/create_poker_session.rb` | Create session mutation |
| `backend/app/graphql/mutations/update_poker_session.rb` | Update session mutation |
| `backend/app/graphql/mutations/delete_poker_session.rb` | Delete session mutation |
| `backend/app/graphql/types/action_input_type.rb` | Input type for hand actions (used by CreatePokerHand) |
| `backend/app/graphql/mutations/create_poker_hand.rb` | Create hand mutation (with nested actions) |
| `backend/app/graphql/mutations/delete_poker_hand.rb` | Delete hand mutation |
| `backend/app/controllers/graphql_controller.rb` | Single endpoint: POST /graphql |
| `backend/test/controllers/graphql_controller_test.rb` | Integration tests for all queries/mutations |

### Backend — files to modify

| Path | Change |
|------|--------|
| `backend/Gemfile` | Add `gem 'graphql', '~> 2.3'` |
| `backend/config/routes.rb` | Remove all `/api/v1/` routes; add `post '/graphql', to: 'graphql#execute'` |

### Frontend — files to create

| Path | Responsibility |
|------|---------------|
| `frontend/src/api/apollo.ts` | Apollo Client singleton with auth link + URI |

### Frontend — files to replace/rewrite

| Path | Change |
|------|--------|
| `frontend/src/api/client.ts` | Replace `fetchSubApps()` REST call with Apollo `useQuery` export of `SUB_APPS_QUERY` |
| `frontend/src/sub-apps/poker-tracker/api.ts` | Replace all REST helpers with Apollo `gql` documents + typed hooks |

### Frontend — files to modify

| Path | Change |
|------|--------|
| `frontend/package.json` | Add `@apollo/client`, `graphql` |
| `frontend/App.tsx` | Wrap tree in `<ApolloProvider client={client}>` |
| `frontend/src/screens/HomeScreen.tsx` | Use `useQuery(SUB_APPS_QUERY)` instead of `fetchSubApps()` |
| `frontend/src/sub-apps/poker-tracker/PokerTrackerNavigator.tsx` | Remove fetch calls replaced by hooks in screens |
| `frontend/src/sub-apps/poker-tracker/SessionList.tsx` | Use `usePokerSessions()` hook |
| `frontend/src/sub-apps/poker-tracker/SessionDetail.tsx` | Use `usePokerSession(id)` hook |
| `frontend/src/sub-apps/poker-tracker/HandDetail.tsx` | Use `usePokerHand(sessionId, handId)` hook |
| `frontend/src/sub-apps/poker-tracker/AllHandsList.tsx` | Use `useAllHands()` hook |
| `frontend/src/sub-apps/poker-tracker/StatsScreen.tsx` | Use `usePokerStats()` hook |
| `frontend/src/sub-apps/poker-tracker/NewHandForm.tsx` | Use `useCreateHand()` mutation hook |
| `frontend/src/sub-apps/poker-tracker/NewSessionForm.tsx` | Use `useCreateSession()` mutation hook |

---

## Task 1: Install graphql-ruby and generate boilerplate

**Files:**
- Modify: `backend/Gemfile`
- Create: all `backend/app/graphql/types/base_*.rb` and `backend/app/graphql/playground_schema.rb`

- [ ] **Step 1.1: Add gem to Gemfile**

In `backend/Gemfile`, add after the existing gems:
```ruby
gem 'graphql', '~> 2.3'
```

- [ ] **Step 1.2: Install the gem**

```sh
cd /home/user/Playground/backend
mise exec -- bundle install
```
Expected: `graphql 2.3.x` appears in output.

- [ ] **Step 1.3: Create base type files**

Create `backend/app/graphql/types/base_field.rb`:
```ruby
module Types
  class BaseField < GraphQL::Schema::Field
    argument_class Types::BaseArgument
  end
end
```

Create `backend/app/graphql/types/base_argument.rb`:
```ruby
module Types
  class BaseArgument < GraphQL::Schema::Argument
  end
end
```

Create `backend/app/graphql/types/base_object.rb`:
```ruby
module Types
  class BaseObject < GraphQL::Schema::Object
    field_class Types::BaseField
    argument_class Types::BaseArgument
  end
end
```

Create `backend/app/graphql/types/base_input_object.rb`:
```ruby
module Types
  class BaseInputObject < GraphQL::Schema::InputObject
    argument_class Types::BaseArgument
  end
end
```

Create `backend/app/graphql/types/base_enum.rb`:
```ruby
module Types
  class BaseEnum < GraphQL::Schema::Enum
  end
end
```

Create `backend/app/graphql/types/base_scalar.rb`:
```ruby
module Types
  class BaseScalar < GraphQL::Schema::Scalar
  end
end
```

Create `backend/app/graphql/types/base_union.rb`:
```ruby
module Types
  class BaseUnion < GraphQL::Schema::Union
    argument_class Types::BaseArgument
    field_class Types::BaseField
  end
end
```

Create `backend/app/graphql/mutations/base_mutation.rb`:
```ruby
module Mutations
  class BaseMutation < GraphQL::Schema::Mutation
    argument_class Types::BaseArgument
    field_class Types::BaseField
    input_object_class Types::BaseInputObject
    object_class Types::BaseObject
  end
end
```

- [ ] **Step 1.4: Commit**

```sh
cd /home/user/Playground/backend
git add Gemfile Gemfile.lock app/graphql/
git commit -m "chore: install graphql-ruby and create base type classes"
```

---

## Task 2: Define GraphQL object types

**Files:**
- Create: `backend/app/graphql/types/sub_app_type.rb`
- Create: `backend/app/graphql/types/poker_action_type.rb`
- Create: `backend/app/graphql/types/poker_hand_type.rb`
- Create: `backend/app/graphql/types/poker_session_type.rb`
- Create: `backend/app/graphql/types/profit_by_date_type.rb`
- Create: `backend/app/graphql/types/poker_stats_type.rb`

- [ ] **Step 2.1: SubAppType**

Create `backend/app/graphql/types/sub_app_type.rb`:
```ruby
module Types
  class SubAppType < BaseObject
    field :id,          ID,     null: false
    field :name,        String, null: false
    field :slug,        String, null: false
    field :description, String, null: true
    field :icon,        String, null: false
    field :color,       String, null: false
  end
end
```

- [ ] **Step 2.2: PokerActionType**

Create `backend/app/graphql/types/poker_action_type.rb`:
```ruby
module Types
  class PokerActionType < BaseObject
    field :id,              ID,      null: false
    field :street,          String,  null: false
    field :actor,           String,  null: false
    field :villain_position, String, null: true
    field :action_type,     String,  null: false
    field :amount_cents,    Integer, null: true
    field :sequence,        Integer, null: false
  end
end
```

- [ ] **Step 2.3: PokerHandType**

Create `backend/app/graphql/types/poker_hand_type.rb`:
```ruby
module Types
  class PokerHandType < BaseObject
    field :id,                    ID,      null: false
    field :poker_session_id,      ID,      null: false
    field :hero_cards,            String,  null: true
    field :hero_position,         String,  null: true
    field :effective_stack_cents, Integer, null: true
    field :pot_result_cents,      Integer, null: true
    field :notes,                 String,  null: true
    field :villain_cards,         GraphQL::Types::JSON, null: true
    field :actions,               [PokerActionType], null: false

    def actions
      object.poker_actions.order(:sequence)
    end
  end
end
```

- [ ] **Step 2.4: PokerSessionType**

Create `backend/app/graphql/types/poker_session_type.rb`:
```ruby
module Types
  class PokerSessionType < BaseObject
    field :id,                ID,      null: false
    field :date,              String,  null: false
    field :buy_in_cents,      Integer, null: false
    field :cash_out_cents,    Integer, null: false
    field :profit_cents,      Integer, null: false
    field :location,          String,  null: true
    field :game_type,         String,  null: true
    field :stakes,            String,  null: true
    field :duration_minutes,  Integer, null: true
    field :hands,             [PokerHandType], null: false

    def profit_cents
      object.profit_cents
    end

    def hands
      object.poker_hands
    end

    def date
      object.date.to_s
    end
  end
end
```

- [ ] **Step 2.5: ProfitByDateType and PokerStatsType**

Create `backend/app/graphql/types/profit_by_date_type.rb`:
```ruby
module Types
  class ProfitByDateType < BaseObject
    field :date,         String,  null: false
    field :profit_cents, Integer, null: false
  end
end
```

Create `backend/app/graphql/types/poker_stats_type.rb`:
```ruby
module Types
  class PokerStatsType < BaseObject
    field :total_profit_cents,          Integer, null: false
    field :session_count,               Integer, null: false
    field :avg_profit_per_session_cents, Integer, null: false
    field :profit_by_date,              [ProfitByDateType], null: false
    field :win_rate_by_position,        GraphQL::Types::JSON, null: false
  end
end
```

- [ ] **Step 2.6: Commit**

```sh
cd /home/user/Playground/backend
git add app/graphql/types/
git commit -m "feat(graphql): add SubApp, PokerSession, PokerHand, PokerAction, PokerStats types"
```

---

## Task 3: Implement QueryType

**Files:**
- Create: `backend/app/graphql/types/query_type.rb`

Queries to expose (matching current REST GET endpoints):

| GraphQL query | REST equivalent |
|---|---|
| `subApps` | GET /api/v1/sub_apps |
| `pokerSessions` | GET /api/v1/poker/sessions |
| `pokerSession(id)` | GET /api/v1/poker/sessions/:id |
| `pokerHands` | GET /api/v1/poker/hands |
| `pokerHand(sessionId, handId)` | GET /api/v1/poker/sessions/:id/hands/:hand_id |
| `pokerStats` | GET /api/v1/poker/stats |

- [ ] **Step 3.1: Write QueryType**

Create `backend/app/graphql/types/query_type.rb`:
```ruby
module Types
  class QueryType < BaseObject
    field :sub_apps, [SubAppType], null: false,
          description: "Returns enabled sub-apps ordered by position"

    field :poker_sessions, [PokerSessionType], null: false,
          description: "Returns all poker sessions"

    field :poker_session, PokerSessionType, null: true,
          description: "Returns a single poker session by id" do
      argument :id, ID, required: true
    end

    field :poker_hands, [PokerHandType], null: false,
          description: "Returns all poker hands across all sessions"

    field :poker_hand, PokerHandType, null: true,
          description: "Returns a single hand" do
      argument :session_id, ID, required: true
      argument :hand_id,    ID, required: true
    end

    field :poker_stats, PokerStatsType, null: false,
          description: "Returns aggregate poker statistics"

    def sub_apps
      SubApp.enabled.ordered
    end

    def poker_sessions
      PokerSession.order(date: :desc)
    end

    def poker_session(id:)
      PokerSession.find_by(id: id)
    end

    def poker_hands
      PokerHand.includes(:poker_session, :poker_actions).order(id: :desc)
    end

    def poker_hand(session_id:, hand_id:)
      session = PokerSession.find_by(id: session_id)
      session&.poker_hands&.find_by(id: hand_id)
    end

    def poker_stats
      sessions = PokerSession.all
      hands    = PokerHand.includes(:poker_session).all

      total_profit = sessions.sum(&:profit_cents)
      count        = sessions.count
      avg_profit   = count > 0 ? total_profit / count : 0

      profit_by_date = sessions
        .order(:date)
        .map { |s| { date: s.date.to_s, profit_cents: s.profit_cents } }

      win_rate_by_position = PokerHand::POSITIONS.each_with_object({}) do |pos, hash|
        pos_hands = hands.select { |h| h.hero_position == pos }
        next if pos_hands.empty?
        wins = pos_hands.count { |h| h.pot_result_cents.to_i > 0 }
        hash[pos] = wins.to_f / pos_hands.size
      end

      {
        total_profit_cents: total_profit,
        session_count: count,
        avg_profit_per_session_cents: avg_profit,
        profit_by_date: profit_by_date,
        win_rate_by_position: win_rate_by_position
      }
    end
  end
end
```

Note: `PokerHand::POSITIONS` needs to be added to the model if not present. Check `backend/app/models/poker_hand.rb`. If `POSITIONS` is missing, add it:
```ruby
POSITIONS = %w[UTG LJ HJ CO BTN SB BB].freeze
```

- [ ] **Step 3.2: Commit**

```sh
cd /home/user/Playground/backend
git add app/graphql/types/query_type.rb app/models/poker_hand.rb
git commit -m "feat(graphql): implement QueryType with all read queries"
```

---

## Task 4: Implement MutationType

**Files:**
- Create: `backend/app/graphql/mutations/create_poker_session.rb`
- Create: `backend/app/graphql/mutations/update_poker_session.rb`
- Create: `backend/app/graphql/mutations/delete_poker_session.rb`
- Create: `backend/app/graphql/mutations/create_poker_hand.rb`
- Create: `backend/app/graphql/mutations/delete_poker_hand.rb`
- Create: `backend/app/graphql/types/mutation_type.rb`

Mutations to expose (matching current REST POST/PATCH/DELETE endpoints):

| Mutation | REST equivalent |
|---|---|
| `createPokerSession` | POST /api/v1/poker/sessions |
| `updatePokerSession` | PATCH /api/v1/poker/sessions/:id |
| `deletePokerSession` | DELETE /api/v1/poker/sessions/:id |
| `createPokerHand` | POST /api/v1/poker/sessions/:id/hands |
| `deletePokerHand` | DELETE /api/v1/poker/sessions/:id/hands/:hand_id |

- [ ] **Step 4.1: CreatePokerSession**

Create `backend/app/graphql/mutations/create_poker_session.rb`:
```ruby
module Mutations
  class CreatePokerSession < BaseMutation
    argument :date,             String,  required: true
    argument :buy_in_cents,     Integer, required: true
    argument :cash_out_cents,   Integer, required: true
    argument :location,         String,  required: false
    argument :game_type,        String,  required: false
    argument :stakes,           String,  required: false
    argument :duration_minutes, Integer, required: false

    type Types::PokerSessionType

    def resolve(**attrs)
      session = PokerSession.new(attrs)
      session.save!
      session
    rescue ActiveRecord::RecordInvalid => e
      raise GraphQL::ExecutionError, e.message
    end
  end
end
```

- [ ] **Step 4.2: UpdatePokerSession**

Create `backend/app/graphql/mutations/update_poker_session.rb`:
```ruby
module Mutations
  class UpdatePokerSession < BaseMutation
    argument :id,               ID,      required: true
    argument :date,             String,  required: false
    argument :buy_in_cents,     Integer, required: false
    argument :cash_out_cents,   Integer, required: false
    argument :location,         String,  required: false
    argument :game_type,        String,  required: false
    argument :stakes,           String,  required: false
    argument :duration_minutes, Integer, required: false

    type Types::PokerSessionType

    def resolve(id:, **attrs)
      session = PokerSession.find(id)
      session.update!(attrs.compact)
      session
    rescue ActiveRecord::RecordNotFound
      raise GraphQL::ExecutionError, "Session not found"
    rescue ActiveRecord::RecordInvalid => e
      raise GraphQL::ExecutionError, e.message
    end
  end
end
```

- [ ] **Step 4.3: DeletePokerSession**

Create `backend/app/graphql/mutations/delete_poker_session.rb`:
```ruby
module Mutations
  class DeletePokerSession < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false

    def resolve(id:)
      session = PokerSession.find(id)
      session.destroy!
      { success: true }
    rescue ActiveRecord::RecordNotFound
      raise GraphQL::ExecutionError, "Session not found"
    end
  end
end
```

- [ ] **Step 4.4a: Create ActionInputType in its own file**

Create `backend/app/graphql/types/action_input_type.rb` **before** CreatePokerHand so the constant exists when referenced:
```ruby
module Types
  class ActionInputType < BaseInputObject
    argument :street,           String,  required: true
    argument :actor,            String,  required: true
    argument :villain_position, String,  required: false
    argument :action_type,      String,  required: true
    argument :amount_cents,     Integer, required: false
    argument :sequence,         Integer, required: true
  end
end
```

- [ ] **Step 4.4b: CreatePokerHand**

Create `backend/app/graphql/mutations/create_poker_hand.rb`:
```ruby
module Mutations
  class CreatePokerHand < BaseMutation
    argument :session_id,             ID,      required: true
    argument :hero_cards,             String,  required: false
    argument :hero_position,          String,  required: false
    argument :effective_stack_cents,  Integer, required: false
    argument :pot_result_cents,       Integer, required: false
    argument :notes,                  String,  required: false
    argument :villain_cards,          GraphQL::Types::JSON, required: false
    argument :actions,                [Types::ActionInputType], required: false

    type Types::PokerHandType

    def resolve(session_id:, actions: [], **attrs)
      session = PokerSession.find(session_id)
      hand = session.poker_hands.new(attrs)

      if actions.present?
        hand.poker_actions_attributes = actions.map(&:to_h)
      end

      hand.save!
      hand
    rescue ActiveRecord::RecordNotFound
      raise GraphQL::ExecutionError, "Session not found"
    rescue ActiveRecord::RecordInvalid => e
      raise GraphQL::ExecutionError, e.message
    end
  end
end
```

- [ ] **Step 4.5: DeletePokerHand**

Create `backend/app/graphql/mutations/delete_poker_hand.rb`:
```ruby
module Mutations
  class DeletePokerHand < BaseMutation
    argument :session_id, ID, required: true
    argument :hand_id,    ID, required: true

    field :success, Boolean, null: false

    def resolve(session_id:, hand_id:)
      session = PokerSession.find(session_id)
      hand = session.poker_hands.find(hand_id)
      hand.destroy!
      { success: true }
    rescue ActiveRecord::RecordNotFound
      raise GraphQL::ExecutionError, "Hand not found"
    end
  end
end
```

- [ ] **Step 4.6: MutationType**

Create `backend/app/graphql/types/mutation_type.rb`:
```ruby
module Types
  class MutationType < BaseObject
    field :create_poker_session, mutation: Mutations::CreatePokerSession
    field :update_poker_session, mutation: Mutations::UpdatePokerSession
    field :delete_poker_session, mutation: Mutations::DeletePokerSession
    field :create_poker_hand,   mutation: Mutations::CreatePokerHand
    field :delete_poker_hand,   mutation: Mutations::DeletePokerHand
  end
end
```

- [ ] **Step 4.7: Commit**

```sh
cd /home/user/Playground/backend
git add app/graphql/mutations/ app/graphql/types/mutation_type.rb
git commit -m "feat(graphql): implement all mutations for sessions and hands"
```

---

## Task 5: Wire schema, controller, and routes

**Files:**
- Create: `backend/app/graphql/playground_schema.rb`
- Create: `backend/app/controllers/graphql_controller.rb`
- Modify: `backend/config/routes.rb`

- [ ] **Step 5.1: Create schema**

Create `backend/app/graphql/playground_schema.rb`:
```ruby
class PlaygroundSchema < GraphQL::Schema
  mutation(Types::MutationType)
  query(Types::QueryType)

  # For persisted queries or subscriptions, add here if needed later
  use GraphQL::Dataloader
end
```

- [ ] **Step 5.2: Create GraphQL controller**

Create `backend/app/controllers/graphql_controller.rb`:
```ruby
class GraphqlController < ApplicationController
  # Skip the GET/HEAD check — always require write token for mutations
  # The parent ApplicationController already allows GET/HEAD without token.
  # For GraphQL we route all requests through POST, so mutations are covered.

  def execute
    variables  = prepare_variables(params[:variables])
    query      = params[:query]
    operation  = params[:operationName]
    context    = { current_token: request.headers['Authorization']&.remove('Bearer ')&.strip }

    result = PlaygroundSchema.execute(query, variables: variables, context: context, operation_name: operation)
    render json: result
  rescue StandardError => e
    raise e unless Rails.env.development?
    handle_error_in_development(e)
  end

  private

  def prepare_variables(variables_param)
    case variables_param
    when String
      variables_param.present? ? JSON.parse(variables_param) : {}
    when Hash, ActionController::Parameters
      variables_param
    when nil
      {}
    else
      raise ArgumentError, "Unexpected parameter: #{variables_param}"
    end
  end

  def handle_error_in_development(err)
    logger.error err.message
    logger.error err.backtrace.join("\n")
    render json: { errors: [{ message: err.message, backtrace: err.backtrace }], data: {} }, status: 500
  end
end
```

- [ ] **Step 5.3: Update routes**

Replace `backend/config/routes.rb` with:
```ruby
Rails.application.routes.draw do
  post '/graphql', to: 'graphql#execute'
  get  '/up', to: 'rails/health#show', as: :rails_health_check
end
```

This removes all `/api/v1/` REST routes and exposes only `/graphql` and `/up`.

- [ ] **Step 5.4: Verify server boots**

```sh
cd /home/user/Playground/backend
mise exec -- bin/rails runner "puts PlaygroundSchema.to_definition"
```
Expected: Prints the full SDL schema with `type Query`, `type Mutation`, all types.

- [ ] **Step 5.5: Commit**

```sh
cd /home/user/Playground/backend
git add app/graphql/playground_schema.rb app/controllers/graphql_controller.rb config/routes.rb
git commit -m "feat(graphql): wire schema, controller, and replace REST routes with /graphql"
```

---

## Task 6: Write backend integration tests

**Files:**
- Create: `backend/test/controllers/graphql_controller_test.rb`

- [ ] **Step 6.0: Create test infrastructure**

The backend has no `test/` directory yet (no tests exist). Create it:

```sh
mkdir -p /home/user/Playground/backend/test/controllers
```

Create `backend/test/test_helper.rb`:
```ruby
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
```

- [ ] **Step 6.1: Write tests**

Create `backend/test/controllers/graphql_controller_test.rb`:
```ruby
require "test_helper"

class GraphqlControllerTest < ActionDispatch::IntegrationTest
  setup do
    SubApp.create!(name: "Hello World", slug: "hello-world", enabled: true, position: 1)
    @session = PokerSession.create!(date: "2026-01-01", buy_in_cents: 10000, cash_out_cents: 12000)
    @hand = @session.poker_hands.create!(hero_position: "BTN", pot_result_cents: 500)
    @action = @hand.poker_actions.create!(street: "preflop", actor: "hero", action_type: "raise", amount_cents: 300, sequence: 1)
  end

  # --- Helpers ---
  def gql(query, variables: {})
    post "/graphql", params: { query: query, variables: variables.to_json },
                     headers: { "Content-Type": "application/json" }
    JSON.parse(response.body)
  end

  def write_token_headers
    token = ENV.fetch("API_WRITE_TOKEN", nil)
    token ? { "Authorization" => "Bearer #{token}" } : {}
  end

  # --- Queries ---
  test "subApps query returns enabled apps" do
    result = gql("{ subApps { id name slug } }")
    apps = result.dig("data", "subApps")
    assert_not_nil apps
    assert_equal "hello-world", apps.first["slug"]
  end

  test "pokerSessions query returns all sessions" do
    result = gql("{ pokerSessions { id date buyInCents cashOutCents profitCents } }")
    sessions = result.dig("data", "pokerSessions")
    assert_equal 1, sessions.size
    assert_equal 2000, sessions.first["profitCents"]
  end

  test "pokerSession query by id" do
    result = gql("{ pokerSession(id: \"#{@session.id}\") { id date hands { id heroPosition } } }")
    sess = result.dig("data", "pokerSession")
    assert_equal @session.id.to_s, sess["id"]
    assert_equal 1, sess["hands"].size
  end

  test "pokerHands query returns all hands" do
    result = gql("{ pokerHands { id heroPosition potResultCents } }")
    hands = result.dig("data", "pokerHands")
    assert_equal 1, hands.size
    assert_equal "BTN", hands.first["heroPosition"]
  end

  test "pokerHand query by sessionId and handId" do
    result = gql("{ pokerHand(sessionId: \"#{@session.id}\", handId: \"#{@hand.id}\") { id actions { street actionType } } }")
    hand = result.dig("data", "pokerHand")
    assert_equal @hand.id.to_s, hand["id"]
    assert_equal "raise", hand["actions"].first["actionType"]
  end

  test "pokerStats query" do
    result = gql("{ pokerStats { totalProfitCents sessionCount avgProfitPerSessionCents } }")
    stats = result.dig("data", "pokerStats")
    assert_equal 2000, stats["totalProfitCents"]
    assert_equal 1, stats["sessionCount"]
  end

  # --- Mutations ---
  test "createPokerSession mutation" do
    mutation = <<~GQL
      mutation {
        createPokerSession(input: { date: "2026-02-01", buyInCents: 5000, cashOutCents: 6000 }) {
          id date profitCents
        }
      }
    GQL
    result = gql(mutation)
    sess = result.dig("data", "createPokerSession")
    assert_equal 1000, sess["profitCents"]
  end

  test "updatePokerSession mutation" do
    mutation = <<~GQL
      mutation {
        updatePokerSession(input: { id: "#{@session.id}", cashOutCents: 15000 }) {
          id profitCents
        }
      }
    GQL
    result = gql(mutation)
    sess = result.dig("data", "updatePokerSession")
    assert_equal 5000, sess["profitCents"]
  end

  test "deletePokerSession mutation" do
    mutation = <<~GQL
      mutation { deletePokerSession(input: { id: "#{@session.id}" }) { success } }
    GQL
    result = gql(mutation)
    assert result.dig("data", "deletePokerSession", "success")
    assert_nil PokerSession.find_by(id: @session.id)
  end

  test "createPokerHand mutation" do
    mutation = <<~GQL
      mutation {
        createPokerHand(input: {
          sessionId: "#{@session.id}",
          heroPosition: "CO",
          potResultCents: 800,
          actions: [{ street: "preflop", actor: "hero", actionType: "raise", amountCents: 200, sequence: 1 }]
        }) {
          id heroPosition actions { street actionType }
        }
      }
    GQL
    result = gql(mutation)
    hand = result.dig("data", "createPokerHand")
    assert_equal "CO", hand["heroPosition"]
    assert_equal 1, hand["actions"].size
  end

  test "deletePokerHand mutation" do
    mutation = <<~GQL
      mutation { deletePokerHand(input: { sessionId: "#{@session.id}", handId: "#{@hand.id}" }) { success } }
    GQL
    result = gql(mutation)
    assert result.dig("data", "deletePokerHand", "success")
    assert_nil PokerHand.find_by(id: @hand.id)
  end
end
```

- [ ] **Step 6.2: Run tests**

```sh
cd /home/user/Playground/backend
mise exec -- bin/rails test test/controllers/graphql_controller_test.rb
```
Expected: All tests pass. Fix any failures before proceeding.

- [ ] **Step 6.3: Commit**

```sh
cd /home/user/Playground/backend
git add test/
git commit -m "test(graphql): integration tests for all queries and mutations"
```

---

## Task 7: Set up Apollo Client on the frontend

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/api/apollo.ts`
- Modify: `frontend/App.tsx`

- [ ] **Step 7.1: Install Apollo Client**

```sh
cd /home/user/Playground/frontend
mise exec -- npm install @apollo/client graphql
```
Expected: Both packages added to `node_modules` and `package.json`.

- [ ] **Step 7.2: Create Apollo Client singleton**

Create `frontend/src/api/apollo.ts`:
```typescript
import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { API_WRITE_TOKEN, API_BASE_URL } from '../config';

// Replace /api/v1 suffix with /graphql
const GRAPHQL_URL = API_BASE_URL.replace('/api/v1', '') + '/graphql';

const httpLink = createHttpLink({ uri: GRAPHQL_URL });

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    ...(API_WRITE_TOKEN ? { Authorization: `Bearer ${API_WRITE_TOKEN}` } : {}),
  },
}));

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

Note: `@apollo/client/link/context` requires `@apollo/client` ≥ 3. Verify `setContext` import works; if not, install `apollo-link-context` separately.

- [ ] **Step 7.3: Wrap app with ApolloProvider**

Read `frontend/App.tsx`. Add `ApolloProvider` around `NavigationContainer`:
```typescript
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './src/api/apollo';

// In JSX:
<ApolloProvider client={apolloClient}>
  <NavigationContainer>
    ...
  </NavigationContainer>
</ApolloProvider>
```

- [ ] **Step 7.4: Verify TypeScript compiles**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 7.5: Commit**

```sh
cd /home/user/Playground/frontend
git add package.json package-lock.json src/api/apollo.ts App.tsx
git commit -m "feat(frontend): install Apollo Client and wrap app in ApolloProvider"
```

---

## Task 8: Replace sub-apps API client and update HomeScreen

**Files:**
- Rewrite: `frontend/src/api/client.ts`
- Modify: `frontend/src/screens/HomeScreen.tsx`

The current `HomeScreen` calls `fetchSubApps()` imperatively in a `useEffect`. We replace it with `useQuery` from Apollo.

- [ ] **Step 8.1: Rewrite `src/api/client.ts`**

Replace the entire file with:
```typescript
import { gql } from '@apollo/client';

export const SUB_APPS_QUERY = gql`
  query SubApps {
    subApps {
      id
      name
      slug
      description
      icon
      color
    }
  }
`;
```

- [ ] **Step 8.2: Update HomeScreen**

Read the current `HomeScreen.tsx`. Replace the `fetchSubApps()` call pattern:

Old pattern (inside component):
```typescript
import { fetchSubApps } from '../api/client';
// ...
const [subApps, setSubApps] = useState<SubAppDefinition[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchSubApps()
    .then(setSubApps)
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
}, []);
```

New pattern:
```typescript
import { useQuery } from '@apollo/client';
import { SUB_APPS_QUERY } from '../api/client';
// ...
const { data, loading, error } = useQuery(SUB_APPS_QUERY);
const subApps: SubAppDefinition[] = data?.subApps ?? [];
```

The rest of the screen (render logic, error/loading states) stays exactly the same except:
- Replace `error` string check: `if (error)` still works since Apollo's `error` is truthy on failure.
- The loading boolean works identically.

- [ ] **Step 8.3: TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 8.4: Commit**

```sh
cd /home/user/Playground/frontend
git add src/api/client.ts src/screens/HomeScreen.tsx
git commit -m "feat(frontend): migrate HomeScreen to Apollo useQuery for subApps"
```

---

## Task 9: Replace poker API client with Apollo queries/mutations

**Files:**
- Rewrite: `frontend/src/sub-apps/poker-tracker/api.ts`

The current `api.ts` exports imperative async functions. We replace them with `gql` documents + typed Apollo hooks that the poker screens can consume.

- [ ] **Step 9.1: Rewrite `api.ts`**

Replace the entire file with:
```typescript
import { gql, useQuery, useMutation } from '@apollo/client';
import {
  PokerSession, PokerHand, PokerStats,
} from './constants';

// ─── Fragments ────────────────────────────────────────────────────────────────

const SESSION_FIELDS = gql`
  fragment SessionFields on PokerSession {
    id date buyInCents cashOutCents profitCents
    location gameType stakes durationMinutes
  }
`;

const HAND_FIELDS = gql`
  fragment HandFields on PokerHand {
    id pokerSessionId heroCards heroPosition
    effectiveStackCents potResultCents notes villainCards
    actions { id street actor villainPosition actionType amountCents sequence }
  }
`;

// ─── Queries ──────────────────────────────────────────────────────────────────

export const POKER_SESSIONS_QUERY = gql`
  ${SESSION_FIELDS}
  query PokerSessions {
    pokerSessions { ...SessionFields hands { id heroCards heroPosition potResultCents } }
  }
`;

export const POKER_SESSION_QUERY = gql`
  ${SESSION_FIELDS}
  ${HAND_FIELDS}
  query PokerSession($id: ID!) {
    pokerSession(id: $id) { ...SessionFields hands { ...HandFields } }
  }
`;

export const ALL_HANDS_QUERY = gql`
  ${HAND_FIELDS}
  query PokerHands {
    pokerHands { ...HandFields }
  }
`;

export const POKER_HAND_QUERY = gql`
  ${HAND_FIELDS}
  query PokerHand($sessionId: ID!, $handId: ID!) {
    pokerHand(sessionId: $sessionId, handId: $handId) { ...HandFields }
  }
`;

export const POKER_STATS_QUERY = gql`
  query PokerStats {
    pokerStats {
      totalProfitCents sessionCount avgProfitPerSessionCents
      profitByDate { date profitCents }
      winRateByPosition
    }
  }
`;

// ─── Mutations ────────────────────────────────────────────────────────────────

export const CREATE_SESSION_MUTATION = gql`
  ${SESSION_FIELDS}
  mutation CreatePokerSession(
    $date: String!, $buyInCents: Int!, $cashOutCents: Int!,
    $location: String, $gameType: String, $stakes: String, $durationMinutes: Int
  ) {
    createPokerSession(input: {
      date: $date, buyInCents: $buyInCents, cashOutCents: $cashOutCents,
      location: $location, gameType: $gameType, stakes: $stakes, durationMinutes: $durationMinutes
    }) { ...SessionFields }
  }
`;

export const UPDATE_SESSION_MUTATION = gql`
  ${SESSION_FIELDS}
  mutation UpdatePokerSession(
    $id: ID!, $date: String, $buyInCents: Int, $cashOutCents: Int,
    $location: String, $gameType: String, $stakes: String, $durationMinutes: Int
  ) {
    updatePokerSession(input: {
      id: $id, date: $date, buyInCents: $buyInCents, cashOutCents: $cashOutCents,
      location: $location, gameType: $gameType, stakes: $stakes, durationMinutes: $durationMinutes
    }) { ...SessionFields }
  }
`;

export const DELETE_SESSION_MUTATION = gql`
  mutation DeletePokerSession($id: ID!) {
    deletePokerSession(input: { id: $id }) { success }
  }
`;

export const CREATE_HAND_MUTATION = gql`
  ${HAND_FIELDS}
  mutation CreatePokerHand(
    $sessionId: ID!, $heroCards: String, $heroPosition: String,
    $effectiveStackCents: Int, $potResultCents: Int, $notes: String,
    $villainCards: JSON, $actions: [ActionInputType!]
  ) {
    createPokerHand(input: {
      sessionId: $sessionId, heroCards: $heroCards, heroPosition: $heroPosition,
      effectiveStackCents: $effectiveStackCents, potResultCents: $potResultCents,
      notes: $notes, villainCards: $villainCards, actions: $actions
    }) { ...HandFields }
  }
`;

export const DELETE_HAND_MUTATION = gql`
  mutation DeletePokerHand($sessionId: ID!, $handId: ID!) {
    deletePokerHand(input: { sessionId: $sessionId, handId: $handId }) { success }
  }
`;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePokerSessions() {
  return useQuery(POKER_SESSIONS_QUERY);
}

export function usePokerSession(id: string) {
  return useQuery(POKER_SESSION_QUERY, { variables: { id } });
}

export function useAllHands() {
  return useQuery(ALL_HANDS_QUERY);
}

export function usePokerHand(sessionId: string, handId: string) {
  return useQuery(POKER_HAND_QUERY, { variables: { sessionId, handId } });
}

export function usePokerStats() {
  return useQuery(POKER_STATS_QUERY);
}

export function useCreateSession() {
  return useMutation(CREATE_SESSION_MUTATION, {
    refetchQueries: [{ query: POKER_SESSIONS_QUERY }],
  });
}

export function useUpdateSession() {
  return useMutation(UPDATE_SESSION_MUTATION, {
    refetchQueries: [{ query: POKER_SESSIONS_QUERY }],
  });
}

export function useDeleteSession() {
  return useMutation(DELETE_SESSION_MUTATION, {
    refetchQueries: [{ query: POKER_SESSIONS_QUERY }],
  });
}

export function useCreateHand(sessionId: string) {
  return useMutation(CREATE_HAND_MUTATION, {
    refetchQueries: [{ query: POKER_SESSION_QUERY, variables: { id: sessionId } }, { query: ALL_HANDS_QUERY }],
  });
}

export function useDeleteHand(sessionId: string) {
  return useMutation(DELETE_HAND_MUTATION, {
    refetchQueries: [{ query: POKER_SESSION_QUERY, variables: { id: sessionId } }, { query: ALL_HANDS_QUERY }],
  });
}
```

- [ ] **Step 9.2: TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Fix any type errors (the poker screen files will need updating in the next task).

- [ ] **Step 9.3: Commit**

```sh
cd /home/user/Playground/frontend
git add src/sub-apps/poker-tracker/api.ts
git commit -m "feat(frontend): replace poker REST API client with Apollo gql documents and hooks"
```

---

## Task 10: Update poker screens to use Apollo hooks

**Files:**
- Modify: `frontend/src/sub-apps/poker-tracker/SessionList.tsx`
- Modify: `frontend/src/sub-apps/poker-tracker/SessionDetail.tsx`
- Modify: `frontend/src/sub-apps/poker-tracker/HandDetail.tsx`
- Modify: `frontend/src/sub-apps/poker-tracker/AllHandsList.tsx`
- Modify: `frontend/src/sub-apps/poker-tracker/StatsScreen.tsx`
- Modify: `frontend/src/sub-apps/poker-tracker/NewHandForm.tsx`
- Modify: `frontend/src/sub-apps/poker-tracker/NewSessionForm.tsx`

For each screen, the pattern is:
1. Remove imperative `useEffect` + `useState` for data fetching
2. Remove `getSessions()`, `getSession()`, etc. imports from old api
3. Replace with `usePokerSessions()`, `usePokerSession(id)` etc. hooks
4. Map `data?.pokerSessions` to what was previously `sessions` state
5. Keep all UI rendering code unchanged

- [ ] **Step 10.1: Read all poker screen files**

Read each screen file to understand its exact current structure:
- `frontend/src/sub-apps/poker-tracker/SessionList.tsx`
- `frontend/src/sub-apps/poker-tracker/SessionDetail.tsx`
- `frontend/src/sub-apps/poker-tracker/HandDetail.tsx`
- `frontend/src/sub-apps/poker-tracker/AllHandsList.tsx`
- `frontend/src/sub-apps/poker-tracker/StatsScreen.tsx`
- `frontend/src/sub-apps/poker-tracker/NewHandForm.tsx`
- `frontend/src/sub-apps/poker-tracker/NewSessionForm.tsx`

- [ ] **Step 10.2: Update SessionList**

Replace `getSessions()` with `usePokerSessions()`. Example transformation:

Before:
```typescript
import { getSessions, deleteSession } from '../api';
const [sessions, setSessions] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => { getSessions().then(setSessions).finally(() => setLoading(false)); }, []);
const handleDelete = async (id) => {
  await deleteSession(id);
  setSessions(s => s.filter(x => x.id !== id));
};
```

After:
```typescript
import { usePokerSessions, useDeleteSession } from '../api';
const { data, loading, error } = usePokerSessions();
const sessions = data?.pokerSessions ?? [];
const [deleteSession] = useDeleteSession();
const handleDelete = async (id: string) => {
  await deleteSession({ variables: { id } });
  // Apollo refetchQueries handles cache update automatically
};
```

- [ ] **Step 10.3: Update SessionDetail**

Replace `getSession(id)` with `usePokerSession(id)`. The id comes from route params.

Before:
```typescript
import { getSession } from '../api';
const [session, setSession] = useState(null);
useEffect(() => { getSession(route.params.id).then(setSession); }, []);
```

After:
```typescript
import { usePokerSession } from '../api';
const { data, loading } = usePokerSession(String(route.params.id));
const session = data?.pokerSession;
```

- [ ] **Step 10.4: Update AllHandsList**

Replace `getAllHands()` with `useAllHands()`.

After:
```typescript
import { useAllHands } from '../api';
const { data, loading } = useAllHands();
const hands = data?.pokerHands ?? [];
```

- [ ] **Step 10.5: Update StatsScreen**

Replace `getStats()` with `usePokerStats()`.

After:
```typescript
import { usePokerStats } from '../api';
const { data, loading } = usePokerStats();
const stats = data?.pokerStats;
```

- [ ] **Step 10.5b: Update HandDetail**

Replace `getHand(sessionId, handId)` with `usePokerHand(sessionId, handId)`. The ids come from route params.

After:
```typescript
import { usePokerHand } from '../api';
const { data, loading } = usePokerHand(String(route.params.sessionId), String(route.params.handId));
const hand = data?.pokerHand;
```

- [ ] **Step 10.5c: Update NewSessionForm**

Replace `createSession(data)` with `useCreateSession()` mutation.

After:
```typescript
import { useCreateSession } from '../api';
const [createSession] = useCreateSession();
const handleSubmit = async () => {
  await createSession({ variables: { ...sessionData } });
  navigation.goBack();
};
```

- [ ] **Step 10.6: Update NewHandForm**

Replace `createHand(sessionId, handData)` with `useCreateHand(sessionId)` mutation.

Before:
```typescript
import { createHand } from '../api';
const handleSubmit = async () => {
  await createHand(sessionId, { ...handData, actions });
  navigation.goBack();
};
```

After:
```typescript
import { useCreateHand } from '../api';
const [createHand] = useCreateHand(String(sessionId));
const handleSubmit = async () => {
  await createHand({ variables: { sessionId: String(sessionId), ...handData, actions } });
  navigation.goBack();
};
```

- [ ] **Step 10.7: TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Fix any remaining type errors. Common issues:
- Apollo returns `any` typed data — add inline type assertions `data?.pokerSessions as PokerSession[]`
- Mutation variables need to match argument names defined in gql documents (camelCase)

- [ ] **Step 10.8: Commit**

```sh
cd /home/user/Playground/frontend
git add src/sub-apps/poker-tracker/
git commit -m "feat(frontend): update all poker screens to use Apollo hooks"
```

---

## Task 11: Remove config.ts REST URL dependency and clean up

**Files:**
- Modify: `frontend/src/config.ts`
- Delete: any dead imports or helper functions in old api files

- [ ] **Step 11.1: Update config.ts**

Replace `API_BASE_URL` (which pointed to `/api/v1`) with a direct `GRAPHQL_URL`. In `frontend/src/config.ts`:

```typescript
export const GRAPHQL_URL = __DEV__
  ? 'http://localhost:3000/graphql'
  : 'https://playground-api-dyu9.onrender.com/graphql';

export const API_WRITE_TOKEN = process.env.EXPO_PUBLIC_API_WRITE_TOKEN;
```

Then update `frontend/src/api/apollo.ts` to import `GRAPHQL_URL` from `'../config'` directly instead of deriving it from `API_BASE_URL`.

- [ ] **Step 11.2: Verify no stale REST imports remain**

```sh
cd /home/user/Playground/frontend
grep -r "api/v1" src/
grep -r "fetchSubApps\|getSessions\|getSession\|getAllHands\|getHand\|getStats\|createHand\|deleteSession\|deleteHand" src/
```
Expected: No matches.

- [ ] **Step 11.3: Final TypeScript check**

```sh
cd /home/user/Playground/frontend
mise exec -- npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 11.4: Commit**

```sh
cd /home/user/Playground/frontend
git add src/config.ts src/api/
git commit -m "chore(frontend): clean up REST URL config and remove dead imports"
```

---

## Task 12: Push branch

- [ ] **Step 12.1: Push to feature branch**

```sh
cd /home/user/Playground
git push -u origin claude/migrate-to-graphql-RDy5y
```

If push fails due to network error, retry with exponential backoff (2s, 4s, 8s, 16s).

---

## Testing Checklist (manual)

After implementation, verify end-to-end:

1. Start backend: `cd backend && mise exec -- bin/rails server`
2. Confirm `/graphql` responds: `curl -X POST http://localhost:3000/graphql -H 'Content-Type: application/json' -d '{"query":"{ subApps { id name } }"}'`
3. Confirm `/api/v1/sub_apps` returns 404 (route removed)
4. Start frontend: `cd frontend && mise exec -- npx expo start`
5. Open HomeScreen — sub-apps list loads
6. Open Poker Tracker — sessions list loads, create/delete session works
7. Open a session — hands list loads, add hand works
8. Open Stats — statistics display correctly
