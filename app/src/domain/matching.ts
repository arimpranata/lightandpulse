import { serviceAvailability, NOTHING_BOOKED, type BookedLookup } from './availability';
import { activityBudgetIdr, partySize, rankedPreferences } from './profile';
import { qualityScore } from './ranking';
import type { DriverService, Guide, LanguageCode, PreferenceKey, TravellerProfile } from './types';

export type GuideMatch = {
  guide: Guide;
  score: number;
  sharedLanguages: LanguageCode[];
  matchingSpecialties: PreferenceKey[];
  coversArea: boolean;
};

export type DriverMatch = {
  driver: DriverService;
  score: number;
  coversArea: boolean;
  priceFit: number;
};

/**
 * match_guide (spec §15, §24): language is a hard requirement, then specialty,
 * area, quality, availability and price fit. Unavailable guides are excluded.
 */
export function matchGuides(
  guides: Guide[],
  profile: TravellerProfile,
  date: string,
  region: string,
  booked: BookedLookup = NOTHING_BOOKED,
): GuideMatch[] {
  const topInterests = rankedPreferences(profile)
    .slice(0, 3)
    .map((entry) => entry.key);
  return guides
    .filter((guide) => guide.verified)
    .filter((guide) => serviceAvailability(guide, date, booked).available)
    .map((guide) => {
      const sharedLanguages = guide.languages.filter((language) => profile.languages.includes(language));
      const matchingSpecialties = guide.specialties.filter((key) => topInterests.includes(key));
      const coversArea = guide.areas.includes(region);
      const priceFit = guide.dayRate.amount <= activityBudgetIdr(profile.budget) * 2 ? 1 : 0.5;
      const score =
        0.35 * (matchingSpecialties.length / Math.max(1, Math.min(3, guide.specialties.length))) +
        0.25 * (coversArea ? 1 : 0) +
        0.25 * qualityScore(guide.rating) +
        0.15 * priceFit;
      return { guide, score, sharedLanguages, matchingSpecialties, coversArea };
    })
    .filter((match) => match.sharedLanguages.length > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * match_driver (spec §15, §24): the vehicle must seat the whole party; then area,
 * quality and price fit. Unavailable drivers are excluded.
 */
export function matchDrivers(
  drivers: DriverService[],
  profile: TravellerProfile,
  date: string,
  region: string,
  booked: BookedLookup = NOTHING_BOOKED,
): DriverMatch[] {
  const party = partySize(profile);
  const dayBudget = activityBudgetIdr(profile.budget) * 2;
  return drivers
    .filter((driver) => driver.verified)
    .filter((driver) => driver.vehicle.seats >= party)
    .filter((driver) => serviceAvailability(driver, date, booked).available)
    .map((driver) => {
      const coversArea = driver.areas.includes(region);
      const priceFit = driver.dayRate.amount <= dayBudget ? 1 : Math.max(0, 1 - (driver.dayRate.amount - dayBudget) / dayBudget);
      // Prefer the smallest vehicle that fits, so a couple is not sent a 12-seat van.
      const sizeFit = 1 - Math.min(1, (driver.vehicle.seats - party) / 10);
      const score =
        0.3 * (coversArea ? 1 : 0) + 0.3 * qualityScore(driver.rating) + 0.25 * priceFit + 0.15 * sizeFit;
      return { driver, score, coversArea, priceFit };
    })
    .sort((a, b) => b.score - a.score);
}
