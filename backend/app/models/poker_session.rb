class PokerSession < ApplicationRecord
  has_many :poker_hands, dependent: :destroy

  validates :date, presence: true
  validates :buy_in_cents, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :cash_out_cents, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  def profit_cents
    cash_out_cents - buy_in_cents
  end

  def as_json(options = {})
    super(options).tap do |hash|
      hash['profit_cents'] = profit_cents
    end
  end
end
