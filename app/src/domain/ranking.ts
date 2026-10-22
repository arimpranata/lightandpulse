import { evaluate, culturalCompatibility, type GuardianResult } from './cultural';
import { haversineKm, regionCentre } from './geo';
import { activityBudgetIdr, partySize } from './profile';
import {
  eventAvailability,
  experienceAvailability,
  firstOpenSlot,
  NOTHING_BOOKED,
  type BookedLookup,
} from './availability';
import type {
  BaliEvent,
  Destination,
  Experience,
  Inventory,
  LatLng,
  PreferenceKey,
  Reason,
  TravellerProfile,
  Vendor,
} from './types';

/**
 * Ranking weights (spec §9). Tunable configuration, not hard-coded in the UI.
 * Commission is deliberately absent: it must never be a ranking factor.
 */
export const RANKING_WEIGHTS = {
  relevance: 0.25,
  availability: 0.15,
  quality: 0.15,
  culturalCompatibility: 0.15,
  authenticity: 0.1,
  safety: 0.1,
  priceFit: 0.05,
  distance: 0.05,
} as const;

export type RankingFactor = keyof typeof RANKING_WEIGHTS;
export type RankingWeights = Record<RankingFactor, number>;

export type Candidate =
  | { kind: 'destination'; item: Destination }
  | { kind: 'experience'; item: Experience }
  | { kind: 'event'; item: BaliEvent };

export type RankedCandidate = Candidate & {
  score: number;
  factors: Record<RankingFactor, number>;
  reasons: Reason[];
  guardian: GuardianResult;
  /** Bookable start time on the requested date, for experiences and events. */
  slot: string | null;
};

/** Bayesian average on a 1–5 scale, robust to small samples (spec §21). */
export function qualityScore(rating: { average: number; count: number }, prior = 4.2, weight = 10): number {
  const adjusted = (rating.count * rating.average + weight * prior) / (rating.count + weight);
  return Math.min(1, Math.max(0, (adjusted - 1) / 4));
}

function categoriesOf(candidate: Candidate): PreferenceKey[] {
  if (candidate.kind === 'destination') return candidate.item.tags;
  return candidate.item.categories;
}

function coordinatesOf(candidate: Candidate): LatLng {
  if (candidate.kind === 'event') return candidate.item.venue.coordinates;
  return candidate.item.coordinates;
}

export function regionOf(candidate: Candidate): string {
  if (candidate.kind === 'event') return candidate.item.venue.region;
  return candidate.item.region;
}

function priceOf(candidate: Candidate): number {
  if (candidate.kind === 'experience') return candidate.item.price.amount;
  if (candidate.kind === 'event') return Math.min(...candidate.item.ticketTypes.map((type) => type.price.amount));
  return 0;
}

function vendorOf(candidate: Candidate, inventory: Inventory): Vendor | undefined {
  if (candidate.kind === 'destination') return undefined;
  const id = candidate.kind === 'experience' ? candidate.item.vendorId : candidate.item.organizerId;
  return inventory.vendors.find((vendor) => vendor.id === id);
}

/** Mean interest in the item's categories, adjusted for local-vs-luxury style. */
export function relevance(candidate: Candidate, profile: TravellerProfile): number {
  const categories = categoriesOf(candidate);
  if (categories.length === 0) return 0.3;
  const interests = categories.map((key) => profile.preferences[key] / 100);
  const strongest = Math.max(...interests);
  const mean = interests.reduce((sum, value) => sum + value, 0) / interests.length;
  let score = 0.6 * strongest + 0.4 * mean;
  if (candidate.kind === 'experience') {
    const styleFit = 1 - Math.abs(candidate.item.style - profile.localLuxury / 100);
    score = 0.8 * score + 0.2 * styleFit;
  }
  return score;
}

function priceFit(candidate: Candidate, profile: TravellerProfile): number {
  const price = priceOf(candidate);
  if (price === 0) return 1;
  const ceiling = activityBudgetIdr(profile.budget);
  if (price <= ceiling) return 1;
  return Math.max(0, 1 - (price - ceiling) / ceiling);
}

function authenticity(candidate: Candidate, inventory: Inventory): number {
  if (candidate.kind === 'destination') return 0.6;
  const vendor = vendorOf(candidate, inventory);
  if (vendor?.communityOwned) return 1;
  if (candidate.kind === 'experience') {
    const tags = candidate.item.impactTags;
    if (tags.includes('family-run') || tags.includes('local-guide')) return 0.75;
  }
  return 0.45;
}

function safety(candidate: Candidate, inventory: Inventory): number {
  if (candidate.kind === 'destination') return 0.8;
  const status = vendorOf(candidate, inventory)?.verificationStatus;
  if (status === 'verified') return 1;
  if (status === 'pending') return 0.5;
  return 0;
}

function quality(candidate: Candidate): number {
  if (candidate.kind === 'destination') return 0.7;
  return qualityScore(candidate.item.rating);
}

function bookableSlot(
  candidate: Candidate,
  date: string,
  party: number,
  booked: BookedLookup,
): { availability: number; slot: string | null } {
  if (candidate.kind === 'destination') return { availability: 0.8, slot: null };
  if (candidate.kind === 'experience') {
    const slot = firstOpenSlot(candidate.item, date, party, booked);
    return { availability: slot ? 1 : 0, slot };
  }
  const ticket = candidate.item.ticketTypes[0];
  const result = eventAvailability(candidate.item, date, ticket.id, party, booked);
  return { availability: result.available ? 1 : 0, slot: result.available ? candidate.item.schedule.start : null };
}

/**
 * Scores one candidate for a traveller on a date. Returns null when the Cultural
 * Guardian blocks it: blocked items never become recommendations (spec §16).
 */
export function scoreCandidate(
  candidate: Candidate,
  profile: TravellerProfile,
  date: string,
  inventory: Inventory,
  options: { weights?: RankingWeights; booked?: BookedLookup } = {},
): RankedCandidate | null {
  const weights = options.weights ?? RANKING_WEIGHTS;
  const guardian = evaluate(candidate, date, inventory);
  if (guardian.decision === 'block') return null;

  const party = partySize(profile);
  const { availability, slot } = bookableSlot(candidate, date, party, options.booked ?? NOTHING_BOOKED);
  const distanceKm = haversineKm(regionCentre(profile.baseRegion), coordinatesOf(candidate));

  const factors: Record<RankingFactor, number> = {
    relevance: relevance(candidate, profile),
    availability,
    quality: quality(candidate),
    culturalCompatibility: culturalCompatibility(guardian),
    authenticity: authenticity(candidate, inventory),
    safety: safety(candidate, inventory),
    priceFit: priceFit(candidate, profile),
    distance: Math.max(0, 1 - distanceKm / 60),
  };
  const score = (Object.keys(weights) as RankingFactor[]).reduce(
    (sum, factor) => sum + weights[factor] * factors[factor],
    0,
  );

  const reasons: Reason[] = [];
  const topCategory = categoriesOf(candidate)
    .map((key) => ({ key, value: profile.preferences[key] }))
    .sort((a, b) => b.value - a.value)[0];
  if (topCategory && topCategory.value >= 50) reasons.push({ type: 'preference', ...topCategory });
  if (regionOf(candidate) === profile.baseRegion) reasons.push({ type: 'near_base', region: profile.baseRegion });
  if (slot) reasons.push({ type: 'available_at', time: slot });
  if (factors.authenticity === 1) reasons.push({ type: 'community' });
  if (candidate.kind !== 'destination' && factors.priceFit === 1) reasons.push({ type: 'within_budget' });
  if (candidate.kind !== 'destination' && factors.quality >= 0.8) {
    reasons.push({ type: 'well_rated', ...candidate.item.rating });
  }

  return { ...candidate, score, factors, reasons, guardian, slot };
}

export function allCandidates(inventory: Inventory): Candidate[] {
  return [
    ...inventory.destinations.map((item) => ({ kind: 'destination' as const, item })),
    ...inventory.experiences.map((item) => ({ kind: 'experience' as const, item })),
    ...inventory.events.map((item) => ({ kind: 'event' as const, item })),
  ];
}

/** Ranked recommendations for a date; blocked items are excluded. */
export function rank(
  candidates: Candidate[],
  profile: TravellerProfile,
  date: string,
  inventory: Inventory,
  options: { weights?: RankingWeights; booked?: BookedLookup } = {},
): RankedCandidate[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, profile, date, inventory, options))
    .filter((ranked): ranked is RankedCandidate => ranked !== null)
    .sort((a, b) => b.score - a.score);
}

/** Convenience check for a specific experience time (used by detail and cart). */
export function isExperienceBookable(
  experience: Experience,
  date: string,
  time: string,
  party: number,
  booked: BookedLookup = NOTHING_BOOKED,
): boolean {
  return experienceAvailability(experience, date, time, party, booked).available;
}
