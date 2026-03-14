class SubApp < ApplicationRecord
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true,
            format: { with: /\A[a-z0-9\-]+\z/, message: "only lowercase letters, numbers, and hyphens" }

  scope :enabled, -> { where(enabled: true) }
  scope :ordered, -> { order(:position) }
end
