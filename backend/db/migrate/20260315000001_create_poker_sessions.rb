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
