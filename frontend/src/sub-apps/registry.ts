import React from 'react';
import HelloWorldApp from './hello-world/HelloWorldApp';
import PokerTrackerNavigator from './poker-tracker/PokerTrackerNavigator';

type SubAppComponent = React.ComponentType<{ slug: string }>;

// ─── Sub-app registry ────────────────────────────────────────────────────────
//
// To add a new sub-app:
//   1. Create component in src/sub-apps/<slug>/  (entry: <Name>.tsx)
//   2. Register it here: '<slug>': YourComponent
//   3. Backend: add a row to db/seeds.rb (find_or_create_by! slug: '<slug>')
//      and run `bin/rails db:seed` in production (or deploy with enabled: false first)
//
const registry: Record<string, SubAppComponent> = {
  'hello-world': HelloWorldApp,
  'poker-tracker': PokerTrackerNavigator,
};

export function getSubAppComponent(slug: string): SubAppComponent | null {
  return registry[slug] ?? null;
}

export function isSubAppAvailable(slug: string): boolean {
  return slug in registry;
}
