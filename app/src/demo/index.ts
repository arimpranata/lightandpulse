import type { Inventory } from '@/domain/types';
import type { Place } from '@/data/places';

import { DEMO_CULTURAL_RULES } from './cultural-rules';
import { DEMO_DRIVERS, DEMO_EVENTS, DEMO_EXPERIENCES, DEMO_GUIDES, DEMO_VENDORS, toDestination } from './inventory';

/** Combines curated destinations with the demo marketplace inventory. */
export function buildInventory(places: readonly Place[], regions: Record<string, string>): Inventory {
  return {
    destinations: places.map(toDestination),
    experiences: DEMO_EXPERIENCES,
    events: DEMO_EVENTS,
    vendors: DEMO_VENDORS,
    guides: DEMO_GUIDES,
    drivers: DEMO_DRIVERS,
    rules: DEMO_CULTURAL_RULES,
    regions,
  };
}
