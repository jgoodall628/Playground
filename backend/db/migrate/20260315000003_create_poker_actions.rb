class CreatePokerActions < ActiveRecord::Migration[8.1]
  def change
    create_table :poker_actions do |t|
      t.references :poker_hand, null: false, foreign_key: true
      t.string :street, null: false
      t.string :actor, null: false
      t.string :villain_position
      t.string :action_type, null: false
      t.integer :amount_cents
      t.integer :sequence, null: false

      t.timestamps
    end
  end
end
