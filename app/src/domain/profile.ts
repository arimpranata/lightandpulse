import { addDays, todayIso } from './time';
import {
  PREFERENCE_KEYS,
  type BudgetBand,
  type PaceBand,
  type PreferenceKey,
  type StyleBand,
  type TravellerProfile,
} from './types';

export function paceBand(pace: number): PaceBand {
  if (pace < 34) return 'slow';
  if (pace < 67) return 'balanced';
  return 'packed';
}

export function budgetBand(budget: number): BudgetBand {
  if (budget < 25) return 'budget';
  if (budget < 55) return 'mid';
  if (budget < 80) return 'mid_high';
  return 'premium';
}

export function styleBand(localLuxury: number): StyleBand {
  if (localLuxury < 34) return 'local';
  if (localLuxury < 67) return 'balanced';
  return 'premium';
}

/** Activities per day for each pace band (spec §10: pace controls density). */
export const ACTIVITIES_PER_DAY: Record<PaceBand, number> = { slow: 2, balanced: 3, packed: 4 };

/**
 * Indicative ceiling on spend per person per activity, in IDR, for the budget
 * slider. Used only for price-fit ranking; never shown as a price.
 */
export function activityBudgetIdr(budget: number): number {
  // 250k at 0 rising exponentially to 2.5M at 100.
  return Math.round(250_000 * Math.pow(10, budget / 100));
}

export function defaultProfile(now: Date = new Date()): TravellerProfile {
  return {
    preferences: {
      spiritual: 50,
      culture: 60,
      wellbeing: 50,
      adventure: 40,
      culinary: 50,
      arts: 40,
      beach: 40,
      nightlife: 20,
    },
    localLuxury: 40,
    pace: 40,
    budget: 50,
    startDate: addDays(todayIso(now), 14),
    tripDays: 4,
    party: { adults: 2, children: 0 },
    baseRegion: 'ubud',
    languages: ['en'],
    updatedAt: now.toISOString(),
  };
}

/** Preferences ordered from strongest to weakest. */
export function rankedPreferences(profile: TravellerProfile): { key: PreferenceKey; value: number }[] {
  return PREFERENCE_KEYS.map((key) => ({ key, value: profile.preferences[key] })).sort(
    (a, b) => b.value - a.value,
  );
}

export function partySize(profile: TravellerProfile): number {
  return Math.max(1, profile.party.adults + profile.party.children);
}

/** Structured profile persisted for the AI layer (spec §8: "Persist as structured JSON"). */
export function profileVector(profile: TravellerProfile) {
  return {
    traveller_profile: {
      ...Object.fromEntries(PREFERENCE_KEYS.map((key) => [key, profile.preferences[key] / 100])),
      style: styleBand(profile.localLuxury),
      pace: paceBand(profile.pace),
      budget: budgetBand(profile.budget),
    },
  };
}

export function clampProfile(profile: TravellerProfile): TravellerProfile {
  const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
  return {
    ...profile,
    preferences: Object.fromEntries(
      PREFERENCE_KEYS.map((key) => [key, clamp(profile.preferences[key])]),
    ) as Record<PreferenceKey, number>,
    localLuxury: clamp(profile.localLuxury),
    pace: clamp(profile.pace),
    budget: clamp(profile.budget),
    tripDays: Math.min(14, Math.max(1, Math.round(profile.tripDays))),
    party: {
      adults: Math.min(20, Math.max(1, Math.round(profile.party.adults))),
      children: Math.min(20, Math.max(0, Math.round(profile.party.children))),
    },
  };
}
