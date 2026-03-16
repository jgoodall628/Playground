Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :sub_apps, only: [:index]

      namespace :poker do
        get 'hands', to: 'hands#index'
        get 'stats', to: 'stats#index'

        resources :sessions, only: [:index, :create, :show, :update, :destroy] do
          resources :hands, only: [:index, :create, :show, :update, :destroy] do
            resources :actions, only: [:create, :update, :destroy]
          end
        end
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
