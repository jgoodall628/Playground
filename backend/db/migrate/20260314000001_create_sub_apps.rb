class CreateSubApps < ActiveRecord::Migration[8.0]
  def change
    create_table :sub_apps do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.string :description
      t.string :icon, default: "cube-outline"
      t.string :color, default: "#4A90D9"
      t.integer :position, default: 0
      t.boolean :enabled, default: true
      t.timestamps
    end
  end
end
