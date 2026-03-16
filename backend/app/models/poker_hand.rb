class PokerHand < ApplicationRecord
  POSITIONS = %w[BTN CO MP UTG SB BB].freeze

  belongs_to :poker_session
  has_many :poker_actions, dependent: :destroy

  accepts_nested_attributes_for :poker_actions

  validates :hero_position, inclusion: { in: POSITIONS }, allow_nil: true
end
