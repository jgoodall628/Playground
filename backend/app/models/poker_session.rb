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
class PokerSession < ApplicationRecord
  has_many :poker_hands, dependent: :destroy

  validates :date, presence: true
  validates :buy_in_cents, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :cash_out_cents, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def profit_cents
    cash_out_cents - buy_in_cents
  end

  def as_json(options = {})
    super.tap do |hash|
      hash['profit_cents'] = profit_cents
    end
  end
end
