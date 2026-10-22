import { haversineKm } from './geo';
import type { LatLng, Money } from './types';

export type RouteMode = 'cheapest' | 'fastest' | 'comfortable' | 'sustainable';

export const ROUTE_MODES: RouteMode[] = ['cheapest', 'fastest', 'comfortable', 'sustainable'];

export type TransportId = 'private-driver' | 'ride-hail-car' | 'ride-hail-motorbike' | 'shuttle';

type TransportProfile = {
  id: TransportId;
  /** Average door-to-door speed on Bali roads, km/h. */
  speedKmh: number;
  baseFare: number;
  perKm: number;
  /** Fares charged per person rather than per vehicle. */
  perPerson: boolean;
  /** Vehicle changes on a typical trip. */
  transfers: number;
  /** Seats per vehicle; larger parties need more vehicles. */
  seats: number;
  /** Indicative grams of CO2 per passenger-km. */
  co2PerPassengerKm: number;
  comfort: number;
  /** Wait before departure, minutes. */
  waitMinutes: number;
};

/**
 * DEMO rates and speeds. They are placeholders for the routing and pricing
 * providers (decision D-012) and are shown to travellers as estimates with
 * their assumptions, never as quotes.
 */
export const DEMO_TRANSPORT: TransportProfile[] = [
  { id: 'private-driver', speedKmh: 28, baseFare: 100_000, perKm: 6_000, perPerson: false, transfers: 0, seats: 6, co2PerPassengerKm: 90, comfort: 1, waitMinutes: 0 },
  { id: 'ride-hail-car', speedKmh: 26, baseFare: 15_000, perKm: 5_000, perPerson: false, transfers: 0, seats: 4, co2PerPassengerKm: 110, comfort: 0.8, waitMinutes: 10 },
  { id: 'ride-hail-motorbike', speedKmh: 32, baseFare: 8_000, perKm: 2_500, perPerson: true, transfers: 0, seats: 1, co2PerPassengerKm: 60, comfort: 0.4, waitMinutes: 8 },
  { id: 'shuttle', speedKmh: 22, baseFare: 40_000, perKm: 800, perPerson: true, transfers: 1, seats: 14, co2PerPassengerKm: 35, comfort: 0.6, waitMinutes: 25 },
];

/** Road distance is estimated as straight-line distance times this factor. */
export const ROAD_FACTOR = 1.35;

export type RouteOption = {
  transport: TransportId;
  distanceKm: number;
  durationMinutes: number;
  estimatedCost: Money;
  vehicles: number;
  transfers: number;
  co2Kg: number;
  comfort: number;
};

export type RouteComparison = {
  distanceKm: number;
  options: RouteOption[];
  best: Record<RouteMode, TransportId>;
  assumptions: { roadFactor: number; speeds: Record<TransportId, number>; ratesAreDemo: true };
};

function option(profile: TransportProfile, distanceKm: number, party: number): RouteOption {
  const vehicles = profile.perPerson ? party : Math.ceil(party / profile.seats);
  const fare = profile.baseFare + profile.perKm * distanceKm;
  return {
    transport: profile.id,
    distanceKm,
    durationMinutes: Math.round(profile.waitMinutes + (distanceKm / profile.speedKmh) * 60),
    estimatedCost: { amount: Math.round((fare * vehicles) / 1000) * 1000, currency: 'IDR' },
    vehicles,
    transfers: profile.transfers,
    co2Kg: Math.round(((profile.co2PerPassengerKm * distanceKm * party) / 1000) * 10) / 10,
    comfort: profile.comfort,
  };
}

function minBy(options: RouteOption[], key: (o: RouteOption) => number): TransportId {
  return options.reduce((best, current) => (key(current) < key(best) ? current : best)).transport;
}

/** calculate_route (spec §24): compares movement options between two points. */
export function compareRoutes(origin: LatLng, destination: LatLng, party: number): RouteComparison {
  const distanceKm = Math.round(haversineKm(origin, destination) * ROAD_FACTOR * 10) / 10;
  // Motorbikes suit small parties only; larger groups are not offered one bike each.
  const profiles = DEMO_TRANSPORT.filter((p) => p.id !== 'ride-hail-motorbike' || party <= 2);
  const options = profiles.map((profile) => option(profile, distanceKm, party));
  return {
    distanceKm,
    options,
    best: {
      cheapest: minBy(options, (o) => o.estimatedCost.amount),
      fastest: minBy(options, (o) => o.durationMinutes),
      comfortable: minBy(options, (o) => o.transfers * 10 + (1 - o.comfort) * 5 + o.vehicles),
      sustainable: minBy(options, (o) => o.co2Kg),
    },
    assumptions: {
      roadFactor: ROAD_FACTOR,
      speeds: Object.fromEntries(DEMO_TRANSPORT.map((p) => [p.id, p.speedKmh])) as Record<TransportId, number>,
      ratesAreDemo: true,
    },
  };
}

/** Planning estimate of travel minutes between stops (comfortable car, no wait). */
export function travelMinutes(origin: LatLng, destination: LatLng): number {
  const km = haversineKm(origin, destination) * ROAD_FACTOR;
  if (km < 0.5) return 0;
  return Math.round((km / 28) * 60);
}
