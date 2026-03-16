# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_15_000003) do
  create_table "poker_actions", force: :cascade do |t|
    t.string "action_type", null: false
    t.string "actor", null: false
    t.integer "amount_cents"
    t.datetime "created_at", null: false
    t.integer "poker_hand_id", null: false
    t.integer "sequence", null: false
    t.string "street", null: false
    t.datetime "updated_at", null: false
    t.string "villain_position"
    t.index ["poker_hand_id"], name: "index_poker_actions_on_poker_hand_id"
  end

  create_table "poker_hands", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "effective_stack_cents"
    t.string "hero_cards"
    t.string "hero_position"
    t.text "notes"
    t.integer "poker_session_id", null: false
    t.integer "pot_result_cents"
    t.datetime "updated_at", null: false
    t.index ["poker_session_id"], name: "index_poker_hands_on_poker_session_id"
  end

  create_table "poker_sessions", force: :cascade do |t|
    t.integer "buy_in_cents", null: false
    t.integer "cash_out_cents", null: false
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.integer "duration_minutes"
    t.string "game_type"
    t.string "location"
    t.string "stakes"
    t.datetime "updated_at", null: false
  end

  create_table "sub_apps", force: :cascade do |t|
    t.string "color", default: "#4A90D9"
    t.datetime "created_at", null: false
    t.string "description"
    t.boolean "enabled", default: true
    t.string "icon", default: "cube-outline"
    t.string "name", null: false
    t.integer "position", default: 0
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_sub_apps_on_slug", unique: true
  end

  add_foreign_key "poker_actions", "poker_hands"
  add_foreign_key "poker_hands", "poker_sessions"
end
