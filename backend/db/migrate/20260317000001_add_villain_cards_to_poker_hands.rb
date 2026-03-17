class AddVillainCardsToPokerHands < ActiveRecord::Migration[8.1]
  def change
    add_column :poker_hands, :villain_cards, :json
  end
end
