require 'test_helper'

class SubAppTest < ActiveSupport::TestCase
  test 'valid sub_app' do
    sub_app = SubApp.new(name: 'Test App', slug: 'test-app')
    assert sub_app.valid?
  end

  test 'requires name' do
    sub_app = SubApp.new(slug: 'test-app')
    assert_not sub_app.valid?
    assert_includes sub_app.errors[:name], "can't be blank"
  end

  test 'requires slug' do
    sub_app = SubApp.new(name: 'Test App')
    assert_not sub_app.valid?
    assert_includes sub_app.errors[:slug], "can't be blank"
  end

  test 'requires unique slug' do
    sub_app = SubApp.new(name: 'Duplicate', slug: sub_apps(:hello_world).slug)
    assert_not sub_app.valid?
    assert_includes sub_app.errors[:slug], 'has already been taken'
  end

  test 'slug allows lowercase letters numbers and hyphens' do
    sub_app = SubApp.new(name: 'Valid', slug: 'my-app-123')
    assert sub_app.valid?
  end

  test 'slug rejects uppercase letters' do
    sub_app = SubApp.new(name: 'Invalid', slug: 'My-App')
    assert_not sub_app.valid?
  end

  test 'slug rejects spaces' do
    sub_app = SubApp.new(name: 'Invalid', slug: 'my app')
    assert_not sub_app.valid?
  end

  test 'slug rejects underscores' do
    sub_app = SubApp.new(name: 'Invalid', slug: 'my_app')
    assert_not sub_app.valid?
  end

  test 'enabled scope returns only enabled apps' do
    enabled = SubApp.enabled
    assert enabled.all?(&:enabled?)
    assert_not_includes enabled.to_a, sub_apps(:disabled_app)
  end

  test 'ordered scope returns apps by position' do
    ordered = SubApp.ordered
    positions = ordered.pluck(:position)
    assert_equal positions, positions.sort
  end
end
