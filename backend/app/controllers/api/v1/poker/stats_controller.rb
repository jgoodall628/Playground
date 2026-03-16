module Api
  module V1
    module Poker
      class StatsController < ApplicationController
        def index
          sessions = PokerSession.order(:date)
          total_profit = sessions.sum { |s| s.profit_cents }
          session_count = sessions.count
          avg_profit = session_count > 0 ? (total_profit.to_f / session_count).round : 0

          profit_by_date = sessions.map { |s|
            { 'date' => s.date.to_s, 'profit_cents' => s.profit_cents }
          }

          win_rate_by_position = compute_win_rate_by_position

          render json: {
            total_profit_cents: total_profit,
            session_count: session_count,
            avg_profit_per_session_cents: avg_profit,
            profit_by_date: profit_by_date,
            win_rate_by_position: win_rate_by_position
          }
        end

        private

        def compute_win_rate_by_position
          hands = PokerHand.where.not(hero_position: nil).where.not(pot_result_cents: nil)
          by_position = hands.group_by(&:hero_position)

          by_position.transform_values do |hs|
            won = hs.count { |h| h.pot_result_cents > 0 }
            (won.to_f / hs.size).round(2)
          end
        end
      end
    end
  end
end
