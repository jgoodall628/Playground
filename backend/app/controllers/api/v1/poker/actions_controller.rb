module Api
  module V1
    module Poker
      class ActionsController < ApplicationController
        before_action :set_hand
        before_action :set_action, only: [:update, :destroy]

        def create
          action = @hand.poker_actions.new(action_params)
          if action.save
            render json: action.as_json(only: [:id, :street, :actor, :villain_position, :action_type, :amount_cents, :sequence]), status: :created
          else
            render json: { errors: action.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @action.update(action_params)
            render json: @action.as_json(only: [:id, :street, :actor, :villain_position, :action_type, :amount_cents, :sequence])
          else
            render json: { errors: @action.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @action.destroy
          head :no_content
        end

        private

        def set_hand
          session = PokerSession.find(params[:session_id])
          @hand = session.poker_hands.find(params[:hand_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Not found' }, status: :not_found
        end

        def set_action
          @action = @hand.poker_actions.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Action not found' }, status: :not_found
        end

        def action_params
          params.require(:poker_action).permit(:street, :actor, :villain_position, :action_type, :amount_cents, :sequence)
        end
      end
    end
  end
end
