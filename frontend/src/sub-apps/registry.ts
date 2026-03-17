import React from 'react';
import HelloWorldApp from './hello-world/HelloWorldApp';
import PokerTrackerNavigator from './poker-tracker/PokerTrackerNavigator';

type SubAppComponent = React.ComponentType<{ slug: string }>;

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
