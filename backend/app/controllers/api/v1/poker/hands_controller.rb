module Api
  module V1
    module Poker
      class HandsController < ApplicationController
        before_action :set_session, only: [:index, :create, :show, :update, :destroy]
        before_action :set_hand, only: [:show, :update, :destroy]

        # GET /api/v1/poker/hands — all hands (no session_id)
        # GET /api/v1/poker/sessions/:session_id/hands — hands for a session
        def index
          if params[:session_id]
            hands = @poker_session.poker_hands.order(created_at: :desc)
            render json: hands.as_json(only: [:id, :hero_cards, :hero_position, :pot_result_cents])
          else
            hands = PokerHand.includes(:poker_session).order(created_at: :desc)
            render json: hands.map { |h|
              h.as_json(only: [:id, :hero_cards, :hero_position, :pot_result_cents]).merge(
                'session' => h.poker_session.as_json(only: [:id, :date, :stakes])
              )
            }
          end
        end

        # GET /api/v1/poker/sessions/:session_id/hands/:id
        def show
          actions = @hand.poker_actions.order(:street, :sequence).map { |a|
            a.as_json(only: [:id, :street, :actor, :villain_position, :action_type, :amount_cents, :sequence])
          }
          render json: @hand.as_json(
            only: [:id, :poker_session_id, :hero_cards, :hero_position, :effective_stack_cents, :pot_result_cents, :notes]
          ).merge('actions' => actions)
        end

        def create
          hand = @poker_session.poker_hands.new(hand_params)
          if hand.save
            render json: hand.as_json(only: [:id, :hero_cards, :hero_position, :pot_result_cents]), status: :created
          else
            render json: { errors: hand.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @hand.update(hand_update_params)
            render json: @hand.as_json(only: [:id, :hero_cards, :hero_position, :effective_stack_cents, :pot_result_cents, :notes])
          else
            render json: { errors: @hand.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @hand.destroy
          head :no_content
        end

        private

        def set_session
          return unless params[:session_id]
          @poker_session = PokerSession.find(params[:session_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Session not found' }, status: :not_found
        end

        def set_hand
          @hand = @poker_session.poker_hands.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Hand not found' }, status: :not_found
        end

        def hand_params
          params.require(:poker_hand).permit(
            :hero_cards, :hero_position, :effective_stack_cents, :pot_result_cents, :notes,
            poker_actions_attributes: [:street, :actor, :villain_position, :action_type, :amount_cents, :sequence]
          )
        end

        def hand_update_params
          params.require(:poker_hand).permit(:hero_cards, :hero_position, :effective_stack_cents, :pot_result_cents, :notes)
        end
      end
    end
  end
end
