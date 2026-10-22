import { describe, expect, it } from '@jest/globals';

import { applyIntent, parseIntent } from '@/domain/intent';
import { matchDrivers, matchGuides } from '@/domain/matching';
import { compareRoutes } from '@/domain/routing';
import { parseOpeningHours, parseVisitMinutes } from '@/domain/time';

import { inventory, profile, TRIP_START } from './fixtures';

const ubud = { latitude: -8.5069, longitude: 115.2625 };
const uluwatu = { latitude: -8.8291, longitude: 115.0849 };

describe('route comparison', () => {
  const comparison = compareRoutes(ubud, uluwatu, 2);

  it('offers the four spec modes with a best option for each', () => {
    expect(Object.keys(comparison.best).sort()).toEqual(['cheapest', 'comfortable', 'fastest', 'sustainable']);
  });

  it('picks options consistent with each objective', () => {
    const byId = Object.fromEntries(comparison.options.map((o) => [o.transport, o]));
    const cheapest = byId[comparison.best.cheapest];
    const fastest = byId[comparison.best.fastest];
    expect(comparison.options.every((o) => o.estimatedCost.amount >= cheapest.estimatedCost.amount)).toBe(true);
    expect(comparison.options.every((o) => o.durationMinutes >= fastest.durationMinutes)).toBe(true);
    expect(byId[comparison.best.comfortable].transfers).toBe(0);
  });

  it('exposes its assumptions and marks rates as demo', () => {
    expect(comparison.assumptions.ratesAreDemo).toBe(true);
    expect(comparison.assumptions.roadFactor).toBeGreaterThan(1);
  });

  it('does not offer one motorbike per person to a large group', () => {
    expect(compareRoutes(ubud, uluwatu, 5).options.map((o) => o.transport)).not.toContain('ride-hail-motorbike');
  });
});

describe('guide and driver matching', () => {
  it('requires a shared language and verification', () => {
    // Wednesday 3 March: Made (the only Japanese speaker) is working.
    const matches = matchGuides(inventory.guides, profile({ languages: ['ja'] }), '2027-03-03', 'highlands');
    expect(matches.map((m) => m.guide.id)).toEqual(['gd-made']);
    const all = matchGuides(inventory.guides, profile({ languages: ['id'] }), TRIP_START, 'north');
    expect(all.map((m) => m.guide.id)).not.toContain('gd-gede');
  });

  it('excludes guides on their day off or already booked', () => {
    // 2 March 2027 is a Tuesday (2): Made is off.
    const ids = matchGuides(inventory.guides, profile(), TRIP_START, 'ubud').map((m) => m.guide.id);
    expect(ids).not.toContain('gd-made');
    const bookedIds = matchGuides(inventory.guides, profile(), TRIP_START, 'ubud', (id) => (id === 'gd-wayan' ? 1 : 0)).map((m) => m.guide.id);
    expect(bookedIds).not.toContain('gd-wayan');
  });

  it('only offers vehicles that seat the whole party', () => {
    const matches = matchDrivers(inventory.drivers, profile({ party: { adults: 8, children: 0 } }), TRIP_START, 'ubud');
    expect(matches.map((m) => m.driver.vehicle.seats).every((seats) => seats >= 8)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('intent parser', () => {
  it('understands English and Bahasa Indonesia', () => {
    expect(parseIntent('More culture and a slower pace')).toEqual([
      { type: 'preference', key: 'culture', delta: 25 },
      { type: 'pace', delta: -25 },
    ]);
    expect(parseIntent('lebih banyak pantai, hemat, 5 hari')).toEqual([
      { type: 'preference', key: 'beach', delta: 25 },
      { type: 'budget', delta: -25 },
      { type: 'days', value: 5 },
    ]);
  });

  it('handles negation', () => {
    expect(parseIntent('no nightlife please')).toContainEqual({ type: 'preference', key: 'nightlife', delta: -30 });
    expect(parseIntent('tanpa pantai')).toContainEqual({ type: 'preference', key: 'beach', delta: -30 });
  });

  it('clamps the adjusted profile', () => {
    const p = applyIntent(profile({ pace: 10 }), [{ type: 'pace', delta: -25 }, { type: 'days', value: 40 }]);
    expect(p.pace).toBe(0);
    expect(p.tripDays).toBe(14);
  });
});

describe('content parsing', () => {
  it('parses opening hours and visit lengths without guessing', () => {
    expect(parseOpeningHours('7:00 am – 7:00 pm')).toEqual({ open: 420, close: 1140 });
    expect(parseOpeningHours('Open 24 hours')).toEqual({ open: 0, close: 1440 });
    expect(parseOpeningHours('Treks start 3:30–4:00 am')).toBe('unknown');
    expect(parseVisitMinutes('1.5 hours')).toBe(90);
    expect(parseVisitMinutes('1–2 hours')).toBe(60);
    expect(parseVisitMinutes('Half day')).toBe(240);
  });
});
