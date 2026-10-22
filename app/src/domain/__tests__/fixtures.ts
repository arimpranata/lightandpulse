import { PLACES, REGIONS } from '@/data/places';
import { buildInventory } from '@/demo';
import { defaultProfile } from '@/domain/profile';
import type { TravellerProfile } from '@/domain/types';

export const inventory = buildInventory(PLACES, REGIONS);

/** A Tuesday, so weekday-based schedules are predictable. */
export const TRIP_START = '2027-03-02';

export const NOW = new Date('2027-02-01T00:00:00Z');

export function profile(overrides: Partial<TravellerProfile> = {}): TravellerProfile {
  return { ...defaultProfile(NOW), startDate: TRIP_START, ...overrides };
}
