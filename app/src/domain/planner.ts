import { eventAvailability, experienceAvailability, NOTHING_BOOKED, type BookedLookup } from './availability';
import { haversineKm } from './geo';
import { ACTIVITIES_PER_DAY, paceBand, partySize } from './profile';
import { allCandidates, rank, regionOf, type Candidate, type RankedCandidate } from './ranking';
import { travelMinutes } from './routing';
import { addDays, toMinutes, toTime } from './time';
import type {
  Inventory,
  Journey,
  JourneyDay,
  JourneyItem,
  LatLng,
  TravellerProfile,
} from './types';

/** Gap kept between activities on top of travel time (spec §10). */
export const BUFFER_MINUTES = 15;
const LUNCH = { start: 12 * 60, end: 13 * 60 };
const DAY_START = 8 * 60;
const SIGHTSEEING_END = 18 * 60;
const DAY_END = 22 * 60 + 30;
const STEP = 15;

export type PlanAlert =
  | { kind: 'locked_unavailable'; date: string; itemId: string; alternatives: string[] }
  | { kind: 'locked_dropped'; date: string; title: string }
  | { kind: 'underfilled'; date: string };

export type PlanResult = { journey: Journey; alerts: PlanAlert[] };

type Block = {
  start: number;
  end: number;
  coordinates: LatLng | null;
};

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function coordinatesOf(candidate: Candidate): LatLng {
  return candidate.kind === 'event' ? candidate.item.venue.coordinates : candidate.item.coordinates;
}

function titleOf(candidate: Candidate): string {
  return candidate.kind === 'destination' ? candidate.item.name : candidate.item.title;
}

function durationOf(candidate: Candidate): number {
  if (candidate.kind === 'destination') return candidate.item.visitMinutes;
  if (candidate.kind === 'experience') return candidate.item.durationMin;
  return candidate.item.schedule.durationMin;
}

function travel(a: LatLng | null, b: LatLng | null): number {
  if (!a || !b) return 0;
  return travelMinutes(a, b);
}

/**
 * True when [start, end) at `coordinates` overlaps nothing and leaves travel time
 * plus a buffer to the nearest located items before and after it.
 */
export function fits(blocks: Block[], start: number, end: number, coordinates: LatLng | null): boolean {
  if (blocks.some((block) => start < block.end && end > block.start)) return false;
  if (!coordinates) return true;
  const located = blocks.filter((block) => block.coordinates);
  const before = located.filter((block) => block.end <= start).sort((a, b) => b.end - a.end)[0];
  const after = located.filter((block) => block.start >= end).sort((a, b) => a.start - b.start)[0];
  if (before && before.end + travel(before.coordinates, coordinates) + BUFFER_MINUTES > start) return false;
  if (after && end + travel(coordinates, after.coordinates) + BUFFER_MINUTES > after.start) return false;
  return true;
}

/** Possible start times for a candidate on a date, earliest first. */
function startOptions(candidate: Candidate, date: string, party: number, booked: BookedLookup): number[] {
  if (candidate.kind === 'experience') {
    return candidate.item.slots
      .filter((slot) => experienceAvailability(candidate.item, date, slot, party, booked).available)
      .map(toMinutes);
  }
  if (candidate.kind === 'event') {
    const ticket = candidate.item.ticketTypes[0];
    return eventAvailability(candidate.item, date, ticket.id, party, booked).available
      ? [toMinutes(candidate.item.schedule.start)]
      : [];
  }
  const hours = candidate.item.hours;
  const open = hours === 'unknown' ? DAY_START : Math.max(hours.open, DAY_START);
  const close = hours === 'unknown' ? SIGHTSEEING_END : Math.min(hours.close, SIGHTSEEING_END);
  const options: number[] = [];
  for (let start = open; start + candidate.item.visitMinutes <= close; start += STEP) options.push(start);
  return options;
}

/** Travel minutes added by putting a block at [start, end) among existing blocks. */
function addedTravel(blocks: Block[], start: number, end: number, coordinates: LatLng): number {
  const located = blocks.filter((block) => block.coordinates);
  const before = located.filter((block) => block.end <= start).sort((a, b) => b.end - a.end)[0];
  const after = located.filter((block) => block.start >= end).sort((a, b) => a.start - b.start)[0];
  const into = before ? travel(before.coordinates, coordinates) : 0;
  const out = after ? travel(coordinates, after.coordinates) : 0;
  const direct = before && after ? travel(before.coordinates, after.coordinates) : 0;
  return into + out - direct;
}

/**
 * Picks the start time that adds the least travel (so a visit lands next to
 * anything else at the same place), preferring earlier times on a tie.
 */
function placeCandidate(
  candidate: RankedCandidate,
  blocks: Block[],
  date: string,
  party: number,
  booked: BookedLookup,
): Block | null {
  const duration = durationOf(candidate);
  const coordinates = coordinatesOf(candidate);
  let best: { block: Block; cost: number } | null = null;
  for (const start of startOptions(candidate, date, party, booked)) {
    const end = start + duration;
    if (end > DAY_END || !fits(blocks, start, end, coordinates)) continue;
    const cost = addedTravel(blocks, start, end, coordinates) + start / 600;
    if (!best || cost < best.cost) best = { block: { start, end, coordinates }, cost };
  }
  return best?.block ?? null;
}

function toItem(candidate: RankedCandidate, block: Block, locked = false): JourneyItem {
  return {
    id: nextId('ji'),
    kind: candidate.kind,
    refId: candidate.item.id,
    title: titleOf(candidate),
    start: toTime(block.start),
    end: toTime(block.end),
    coordinates: block.coordinates,
    travelMinutes: 0,
    locked,
    reasons: candidate.reasons,
  };
}

/** Recomputes travel minutes between consecutive located items. */
export function withTravelTimes(items: JourneyItem[]): JourneyItem[] {
  const sorted = [...items].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  let previous: LatLng | null = null;
  return sorted.map((item) => {
    const minutes = previous && item.coordinates ? travel(previous, item.coordinates) : 0;
    if (item.coordinates) previous = item.coordinates;
    return { ...item, travelMinutes: minutes };
  });
}

function blocksOf(items: JourneyItem[]): Block[] {
  return items.map((item) => ({
    start: toMinutes(item.start),
    end: toMinutes(item.end),
    coordinates: item.coordinates,
  }));
}

function mealItem(): JourneyItem {
  return {
    id: nextId('meal'),
    kind: 'meal',
    refId: '',
    title: 'Lunch',
    start: toTime(LUNCH.start),
    end: toTime(LUNCH.end),
    coordinates: null,
    travelMinutes: 0,
    locked: false,
    reasons: [],
  };
}

function isLockedStillAvailable(
  item: JourneyItem,
  date: string,
  inventory: Inventory,
  party: number,
  booked: BookedLookup,
): boolean {
  if (item.kind === 'experience') {
    const experience = inventory.experiences.find((e) => e.id === item.refId);
    return !!experience && experienceAvailability(experience, date, item.start, party, booked).available;
  }
  if (item.kind === 'event') {
    const event = inventory.events.find((e) => e.id === item.refId);
    return !!event && eventAvailability(event, date, event.ticketTypes[0].id, party, booked).available;
  }
  return true;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

/** Total travel minutes between consecutive located blocks of a day. */
function totalTravel(blocks: Block[]): number {
  const located = blocks.filter((block) => block.coordinates).sort((a, b) => a.start - b.start);
  let minutes = 0;
  for (let i = 1; i < located.length; i += 1) minutes += travel(located[i - 1].coordinates, located[i].coordinates);
  return minutes;
}

const isFixedTime = (candidate: RankedCandidate) => candidate.kind !== 'destination';

/**
 * Schedules a set of candidates around locked blocks: fixed-time items first,
 * then flexible visits at the times that add least travel. Lunch stays reserved
 * unless a culinary experience can only fit by running through it.
 */
function scheduleSet(
  set: RankedCandidate[],
  lockedBlocks: Block[],
  lunchFree: boolean,
  date: string,
  party: number,
  booked: BookedLookup,
): { placed: { candidate: RankedCandidate; block: Block }[]; lunchKept: boolean } | null {
  const fixed = set.filter(isFixedTime);
  const flexibleOrders = permutations(set.filter((c) => !isFixedTime(c)));
  const attempt = (reserveLunch: boolean) => {
    let best: { placed: { candidate: RankedCandidate; block: Block }[]; cost: number } | null = null;
    for (const flexible of flexibleOrders) {
      const blocks = [...lockedBlocks];
      if (reserveLunch) blocks.push({ start: LUNCH.start, end: LUNCH.end, coordinates: null });
      const placed: { candidate: RankedCandidate; block: Block }[] = [];
      let ok = true;
      for (const candidate of [...fixed, ...flexible]) {
        const block = placeCandidate(candidate, blocks, date, party, booked);
        if (!block) {
          ok = false;
          break;
        }
        blocks.push(block);
        placed.push({ candidate, block });
      }
      if (!ok) continue;
      const cost = totalTravel(blocks) + Math.min(...placed.map((p) => p.block.start)) / 600;
      if (!best || cost < best.cost) best = { placed, cost };
    }
    return best?.placed ?? null;
  };
  if (lunchFree) {
    const withLunch = attempt(true);
    if (withLunch) return { placed: withLunch, lunchKept: true };
    const culinaryCoversLunch = set.some((c) => c.kind === 'experience' && c.item.categories.includes('culinary'));
    if (!culinaryCoversLunch) return null;
    const withoutLunch = attempt(false);
    const covered = withoutLunch?.some(
      ({ candidate, block }) =>
        candidate.kind === 'experience' &&
        candidate.item.categories.includes('culinary') &&
        block.start < LUNCH.end &&
        block.end > LUNCH.start,
    );
    return withoutLunch && covered ? { placed: withoutLunch, lunchKept: false } : null;
  }
  const placed = attempt(false);
  return placed ? { placed, lunchKept: false } : null;
}

export type PlanOptions = {
  booked?: BookedLookup;
  /** Inventory IDs the traveller removed; never re-added automatically. */
  excludedIds?: string[];
};

/**
 * Builds a day-by-day journey from structured inventory (spec §10). Locked items
 * from `previous` keep their date and time; unavailable locked items are kept and
 * flagged with alternatives rather than silently replaced.
 */
export function planJourney(
  profile: TravellerProfile,
  inventory: Inventory,
  previous: Journey | null = null,
  options: PlanOptions = {},
): PlanResult {
  const booked = options.booked ?? NOTHING_BOOKED;
  const excluded = new Set(options.excludedIds ?? []);
  const party = partySize(profile);
  const perDay = ACTIVITIES_PER_DAY[paceBand(profile.pace)];
  const dates = Array.from({ length: profile.tripDays }, (_, i) => addDays(profile.startDate, i));
  const candidates = allCandidates(inventory);
  const alerts: PlanAlert[] = [];

  const lockedByDate = new Map<string, JourneyItem[]>();
  for (const day of previous?.days ?? []) {
    const locked = day.items.filter((item) => item.locked);
    if (locked.length === 0) continue;
    if (dates.includes(day.date)) lockedByDate.set(day.date, locked);
    else locked.forEach((item) => alerts.push({ kind: 'locked_dropped', date: day.date, title: item.title }));
  }

  const used = new Set<string>();
  lockedByDate.forEach((items) => items.forEach((item) => used.add(item.refId)));
  const regionsUsed = new Set<string>();
  const days: JourneyDay[] = [];

  for (const date of dates) {
    const ranked = rank(candidates, profile, date, inventory, { booked }).filter(
      (candidate) => !used.has(candidate.item.id) && !excluded.has(candidate.item.id),
    );
    const items: JourneyItem[] = [];

    for (const item of lockedByDate.get(date) ?? []) {
      items.push(item);
      if (item.refId && !isLockedStillAvailable(item, date, inventory, party, booked)) {
        const alternatives = ranked
          .filter((candidate) => candidate.kind === item.kind)
          .slice(0, 3)
          .map((candidate) => candidate.item.id);
        alerts.push({ kind: 'locked_unavailable', date, itemId: item.id, alternatives });
      }
    }

    // Anchor the day on a region: a locked item's, or the best candidate's,
    // preferring regions not yet used so the trip spreads across Bali.
    const firstLocked = items.find((item) => item.kind !== 'meal');
    const lockedMatch = firstLocked && candidates.find((candidate) => candidate.item.id === firstLocked.refId);
    const lockedRegion = lockedMatch ? regionOf(lockedMatch) : null;
    const spreadScore = (candidate: RankedCandidate) =>
      candidate.score - (regionsUsed.has(regionOf(candidate)) ? 0.08 : 0);
    const anchor =
      lockedRegion === null ? [...ranked].sort((a, b) => spreadScore(b) - spreadScore(a))[0] : undefined;
    const region = lockedRegion ?? (anchor ? regionOf(anchor) : null);
    if (region) regionsUsed.add(region);
    const anchorPoint = anchor ? coordinatesOf(anchor) : items.find((item) => item.coordinates)?.coordinates ?? null;

    // Cluster: rank by score minus a distance penalty from the day's anchor.
    const clusterScore = (candidate: RankedCandidate) =>
      anchorPoint ? candidate.score - haversineKm(anchorPoint, coordinatesOf(candidate)) * 0.006 : candidate.score;
    const ordered = [...ranked].sort((a, b) => clusterScore(b) - clusterScore(a));

    // Choose the day's items in ranked order, re-scheduling the whole set each
    // time so fixed-time items are placed before flexible destination visits.
    const lockedBlocks = blocksOf(items);
    const lunchFree = !items.some((item) => toMinutes(item.start) < LUNCH.end && toMinutes(item.end) > LUNCH.start);
    let chosen: { candidate: RankedCandidate; block: Block }[] = [];
    let lunchKept = lunchFree;
    for (const candidate of ordered) {
      if (items.length + chosen.length >= perDay) break;
      const trial = scheduleSet([...chosen.map((c) => c.candidate), candidate], lockedBlocks, lunchFree, date, party, booked);
      if (!trial) continue;
      chosen = trial.placed;
      lunchKept = trial.lunchKept;
      used.add(candidate.item.id);
    }
    for (const { candidate, block } of chosen) items.push(toItem(candidate, block));
    const activities = items.length;
    if (lunchKept) items.push(mealItem());

    if (activities < Math.min(perDay, 2)) alerts.push({ kind: 'underfilled', date });
    days.push({ date, region, items: withTravelTimes(items) });
  }

  return { journey: { id: previous?.id ?? nextId('journey'), createdAt: new Date().toISOString(), days }, alerts };
}

// ---------------------------------------------------------------------------
// Editing operations (spec §10: editable day plan, lock/pin)

export function toggleLock(journey: Journey, itemId: string): Journey {
  return {
    ...journey,
    days: journey.days.map((day) => ({
      ...day,
      items: day.items.map((item) => (item.id === itemId ? { ...item, locked: !item.locked } : item)),
    })),
  };
}

export function removeItem(journey: Journey, itemId: string): Journey {
  return {
    ...journey,
    days: journey.days.map((day) => ({
      ...day,
      items: withTravelTimes(day.items.filter((item) => item.id !== itemId)),
    })),
  };
}

/**
 * Adds an item chosen by the traveller to a day at the first time that fits.
 * It is locked so re-planning keeps it. Returns null when nothing fits that day.
 */
export function addToDay(
  journey: Journey,
  date: string,
  candidate: Candidate,
  profile: TravellerProfile,
  inventory: Inventory,
  booked: BookedLookup = NOTHING_BOOKED,
): Journey | null {
  const day = journey.days.find((d) => d.date === date);
  if (!day) return null;
  const ranked = rank([candidate], profile, date, inventory, { booked })[0];
  if (!ranked) return null;
  const blocks = blocksOf(day.items.filter((item) => item.kind !== 'meal'));
  const block = placeCandidate(ranked, blocks, date, partySize(profile), booked);
  if (!block) return null;
  const item: JourneyItem = { ...toItem(ranked, block, true), reasons: [{ type: 'added_by_traveller' }] };
  const items = day.items.filter((existing) => {
    if (existing.kind !== 'meal') return true;
    return !(toMinutes(existing.start) < block.end && toMinutes(existing.end) > block.start);
  });
  return {
    ...journey,
    days: journey.days.map((d) => (d.date === date ? { ...d, items: withTravelTimes([...items, item]) } : d)),
  };
}

/** Problems that would make a day impossible: overlaps or too little travel time. */
export function validateDay(day: JourneyDay): string[] {
  const problems: string[] = [];
  const items = [...day.items].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let i = 1; i < items.length; i += 1) {
    if (toMinutes(items[i - 1].end) > toMinutes(items[i].start)) {
      problems.push(`${items[i - 1].title} overlaps ${items[i].title}`);
    }
  }
  const located = items.filter((item) => item.coordinates);
  for (let i = 1; i < located.length; i += 1) {
    const before = located[i - 1];
    const after = located[i];
    const needed = travel(before.coordinates, after.coordinates) + BUFFER_MINUTES;
    const available = toMinutes(after.start) - toMinutes(before.end);
    if (available < needed) problems.push(`${before.title} → ${after.title}: needs ${needed} min, has ${available}`);
  }
  return problems;
}
