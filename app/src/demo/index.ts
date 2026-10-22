import type { Inventory } from '@/domain/types';
import type { Place } from '@/data/places';

import { DEMO_CULTURAL_RULES } from './cultural-rules';
import { DEMO_DRIVERS, DEMO_EVENTS, DEMO_EXPERIENCES, DEMO_GUIDES, DEMO_VENDORS, toDestination } from './inventory';

/** Marketplace inventory: everything except destinations and region labels. */
export type Marketplace = Omit<Inventory, 'destinations' | 'regions'>;

export const DEMO_MARKETPLACE: Marketplace = {
  experiences: DEMO_EXPERIENCES,
  events: DEMO_EVENTS,
  vendors: DEMO_VENDORS,
  guides: DEMO_GUIDES,
  drivers: DEMO_DRIVERS,
  rules: DEMO_CULTURAL_RULES,
};

/**
 * Combines curated destinations with marketplace inventory: the server's when the
 * app is connected to one, otherwise the bundled demo marketplace.
 */
export function buildInventory(
  places: readonly Place[],
  regions: Record<string, string>,
  marketplace: Marketplace = DEMO_MARKETPLACE,
): Inventory {
  return { destinations: places.map(toDestination), ...marketplace, regions };
}
