module Api
  module V1
    module Poker
      class SessionsController < ApplicationController
        before_action :set_session, only: [:show, :update, :destroy]

        def index
          sessions = PokerSession.order(date: :desc)
          render json: sessions.map { |s|
            s.as_json(only: [:id, :date, :buy_in_cents, :cash_out_cents, :location, :game_type, :stakes, :duration_minutes])
              .merge('profit_cents' => s.profit_cents)
          }
        end

        def show
          hands = @poker_session.poker_hands.map { |h|
            h.as_json(only: [:id, :hero_cards, :hero_position, :pot_result_cents])
          }
          render json: @poker_session.as_json(
            only: [:id, :date, :buy_in_cents, :cash_out_cents, :location, :game_type, :stakes, :duration_minutes]
          ).merge('profit_cents' => @poker_session.profit_cents, 'hands' => hands)
        end

        def create
          session = PokerSession.new(session_params)
          if session.save
            render json: session.as_json(
              only: [:id, :date, :buy_in_cents, :cash_out_cents, :location, :game_type, :stakes, :duration_minutes]
            ).merge('profit_cents' => session.profit_cents), status: :created
          else
            render json: { errors: session.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @poker_session.update(session_params)
            render json: @poker_session.as_json(
              only: [:id, :date, :buy_in_cents, :cash_out_cents, :location, :game_type, :stakes, :duration_minutes]
            ).merge('profit_cents' => @poker_session.profit_cents)
          else
            render json: { errors: @poker_session.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @poker_session.destroy
          head :no_content
        end

        private

        def set_session
          @poker_session = PokerSession.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Session not found' }, status: :not_found
        end

        def session_params
          params.require(:poker_session).permit(:date, :buy_in_cents, :cash_out_cents, :location, :game_type, :stakes, :duration_minutes)
        end
      end
    end
  end
end
