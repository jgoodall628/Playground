module Api
  module V1
    class SubAppsController < ApplicationController
      def index
        sub_apps = SubApp.enabled.ordered
        render json: { sub_apps: sub_apps.as_json(only: %i[id name slug description icon color]) }
      end
    end
  end
end
