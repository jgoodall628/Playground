class ApplicationController < ActionController::API
  before_action :require_write_token

  private

  def require_write_token
    return if request.get? || request.head?

    expected = ENV['API_WRITE_TOKEN'].presence
    return unless expected # token not configured → open (dev/test)

    provided = request.headers['Authorization']&.delete_prefix('Bearer ')
    head :unauthorized unless provided == expected
  end
end
