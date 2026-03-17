# == Schema: poker_hands ==
#
# id                    :integer  not null, primary key
# created_at            :datetime not null
# effective_stack_cents :integer
# hero_cards            :string
# hero_position         :string
# notes                 :text
# poker_session_id      :integer  not null, FK → poker_sessions
# pot_result_cents      :integer
# updated_at            :datetime not null
#
class PokerHand < ApplicationRecord
  POSITIONS = %w[BTN CO MP LJ HJ UTG SB BB].freeze

  belongs_to :poker_session
  has_many :poker_actions, dependent: :destroy

  accepts_nested_attributes_for :poker_actions

  validates :hero_position, inclusion: { in: POSITIONS }, allow_nil: true
end
