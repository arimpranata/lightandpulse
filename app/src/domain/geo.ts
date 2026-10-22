import type { LatLng } from './types';

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Approximate centre of each region, used for "where you are staying". */
export const REGION_CENTRES: Record<string, LatLng> = {
  south: { latitude: -8.72, longitude: 115.17 },
  ubud: { latitude: -8.507, longitude: 115.263 },
  highlands: { latitude: -8.3, longitude: 115.2 },
  east: { latitude: -8.4, longitude: 115.55 },
  north: { latitude: -8.15, longitude: 115.1 },
  west: { latitude: -8.55, longitude: 115.05 },
  nusa: { latitude: -8.73, longitude: 115.54 },
};

export function regionCentre(region: string): LatLng {
  return REGION_CENTRES[region] ?? REGION_CENTRES.ubud;
}
