class CreatePokerHands < ActiveRecord::Migration[8.1]
  def change
    create_table :poker_hands do |t|
      t.references :poker_session, null: false, foreign_key: true
      t.string :hero_cards
      t.string :hero_position
      t.integer :effective_stack_cents
      t.integer :pot_result_cents
      t.text :notes

      t.timestamps
    end
  end
end
