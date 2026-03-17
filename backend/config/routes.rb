Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :sub_apps, only: [:index]

      namespace :poker do
        get 'hands', to: 'hands#index'
        get 'stats', to: 'stats#index'

        resources :sessions, only: %i[index create show update destroy] do
          resources :hands, only: %i[index create show update destroy] do
            resources :actions, only: %i[create update destroy]
          end
        end
      end
    end
  end

  get 'up' => 'rails/health#show', as: :rails_health_check
end
