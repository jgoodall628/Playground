require 'test_helper'

module Api
  module V1
    class SubAppsControllerTest < ActionDispatch::IntegrationTest
      test 'GET /api/v1/sub_apps returns success' do
        get '/api/v1/sub_apps'
        assert_response :success
      end

      test 'GET /api/v1/sub_apps returns sub_apps key' do
        get '/api/v1/sub_apps'
        json = response.parsed_body
        assert json.key?('sub_apps')
      end

      test 'GET /api/v1/sub_apps returns only enabled apps' do
        get '/api/v1/sub_apps'
        json = response.parsed_body
        slugs = json['sub_apps'].pluck('slug')
        assert_includes slugs, 'hello-world'
        assert_not_includes slugs, 'disabled-app'
      end

      test 'GET /api/v1/sub_apps returns apps ordered by position' do
        get '/api/v1/sub_apps'
        json = response.parsed_body
        slugs = json['sub_apps'].pluck('slug')
        hello_idx = slugs.index('hello-world')
        poker_idx = slugs.index('poker-tracker')
        assert hello_idx < poker_idx
      end

      test 'GET /api/v1/sub_apps returns only allowed fields' do
        get '/api/v1/sub_apps'
        json = response.parsed_body
        first_app = json['sub_apps'].first
        allowed_keys = %w[id name slug description icon color]
        assert_equal allowed_keys.sort, first_app.keys.sort
      end
    end
  end
end
