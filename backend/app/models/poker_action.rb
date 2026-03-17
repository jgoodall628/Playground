class PokerAction < ApplicationRecord
  STREETS = %w[preflop flop turn river].freeze
  ACTORS = %w[hero villain].freeze
  ACTION_TYPES = %w[fold check call bet raise].freeze
  POSITIONS = %w[BTN CO MP LJ HJ UTG SB BB].freeze

  belongs_to :poker_hand

  validates :street, presence: true, inclusion: { in: STREETS }
  validates :actor, presence: true, inclusion: { in: ACTORS }
  validates :action_type, presence: true, inclusion: { in: ACTION_TYPES }
  validates :sequence, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :villain_position, presence: true, if: -> { actor == 'villain' }
  validates :villain_position, inclusion: { in: POSITIONS }, allow_nil: true
  validates :amount_cents, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
end
