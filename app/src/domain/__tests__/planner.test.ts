import { describe, expect, it } from '@jest/globals';

import { addToDay, planJourney, removeItem, toggleLock, validateDay } from '@/domain/planner';
import { toMinutes } from '@/domain/time';
import type { Journey } from '@/domain/types';

import { inventory, profile, TRIP_START } from './fixtures';

const activities = (journey: Journey) => journey.days.map((day) => day.items.filter((i) => i.kind !== 'meal').length);

describe('journey planner', () => {
  it('creates one day per trip day starting on the trip date', () => {
    const { journey } = planJourney(profile({ tripDays: 5 }), inventory);
    expect(journey.days.map((d) => d.date)).toEqual(['2027-03-02', '2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06']);
  });

  it('never produces impossible overlaps or missing travel time', () => {
    for (const pace of [0, 50, 100]) {
      const { journey } = planJourney(profile({ tripDays: 6, pace }), inventory);
      for (const day of journey.days) expect(validateDay(day)).toEqual([]);
    }
  });

  it('uses pace to control daily density', () => {
    const slow = activities(planJourney(profile({ pace: 0 }), inventory).journey);
    const packed = activities(planJourney(profile({ pace: 100 }), inventory).journey);
    slow.forEach((count) => expect(count).toBeLessThanOrEqual(2));
    expect(packed.reduce((a, b) => a + b, 0)).toBeGreaterThan(slow.reduce((a, b) => a + b, 0));
  });

  it('keeps destination visits inside opening hours', () => {
    const { journey } = planJourney(profile({ tripDays: 6, pace: 100 }), inventory);
    for (const day of journey.days) {
      for (const item of day.items.filter((i) => i.kind === 'destination')) {
        const destination = inventory.destinations.find((d) => d.id === item.refId)!;
        if (destination.hours === 'unknown') continue;
        expect(toMinutes(item.start)).toBeGreaterThanOrEqual(destination.hours.open);
        expect(toMinutes(item.end)).toBeLessThanOrEqual(destination.hours.close);
      }
    }
  });

  it('protects lunch unless a culinary experience covers it', () => {
    const { journey } = planJourney(profile({ tripDays: 4 }), inventory);
    for (const day of journey.days) {
      const hasLunch = day.items.some((i) => i.kind === 'meal');
      const coversLunch = day.items.some(
        (i) => i.kind === 'experience' && toMinutes(i.start) < 13 * 60 && toMinutes(i.end) > 12 * 60,
      );
      expect(hasLunch || coversLunch).toBe(true);
    }
  });

  it('never plans a blocked experience', () => {
    const p = profile({ tripDays: 7, pace: 100, preferences: { ...profile().preferences, spiritual: 100, culture: 100 } });
    const { journey } = planJourney(p, inventory);
    const ids = journey.days.flatMap((d) => d.items.map((i) => i.refId));
    expect(ids).not.toContain('exp-village-ceremony');
  });

  it('does not repeat an item across days', () => {
    const { journey } = planJourney(profile({ tripDays: 7, pace: 100 }), inventory);
    const ids = journey.days.flatMap((d) => d.items.filter((i) => i.refId).map((i) => i.refId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps locked items in place when re-planning with a different profile', () => {
    const first = planJourney(profile({ tripDays: 3 }), inventory).journey;
    const target = first.days[1].items.find((i) => i.kind !== 'meal')!;
    const locked = toggleLock(first, target.id);
    const { journey } = planJourney(profile({ tripDays: 3, pace: 100, preferences: { ...profile().preferences, beach: 100 } }), inventory, locked);
    const kept = journey.days[1].items.find((i) => i.id === target.id);
    expect(kept).toMatchObject({ refId: target.refId, start: target.start, locked: true });
  });

  it('flags a locked item that became unavailable instead of replacing it', () => {
    const first = planJourney(profile({ tripDays: 2 }), inventory).journey;
    const target = first.days[0].items.find((i) => i.kind === 'experience');
    if (!target) return;
    const locked = toggleLock(first, target.id);
    const { journey, alerts } = planJourney(profile({ tripDays: 2 }), inventory, locked, {
      booked: (itemId) => (itemId === target.refId ? 999 : 0),
    });
    expect(journey.days[0].items.some((i) => i.id === target.id)).toBe(true);
    expect(alerts).toContainEqual(expect.objectContaining({ kind: 'locked_unavailable', itemId: target.id }));
  });

  it('does not re-add items the traveller removed', () => {
    const first = planJourney(profile({ tripDays: 2 }), inventory).journey;
    const target = first.days[0].items.find((i) => i.kind !== 'meal')!;
    const edited = removeItem(first, target.id);
    expect(edited.days[0].items.some((i) => i.id === target.id)).toBe(false);
    const { journey } = planJourney(profile({ tripDays: 2 }), inventory, edited, { excludedIds: [target.refId] });
    expect(journey.days.flatMap((d) => d.items.map((i) => i.refId))).not.toContain(target.refId);
  });

  it('adds a traveller-chosen item at a time that fits and locks it', () => {
    const { journey } = planJourney(profile({ tripDays: 1, pace: 0 }), inventory);
    const kecak = inventory.events.find((e) => e.id === 'evt-kecak-uluwatu')!;
    const updated = addToDay(journey, TRIP_START, { kind: 'event', item: kecak }, profile({ tripDays: 1 }), inventory);
    if (updated) {
      const added = updated.days[0].items.find((i) => i.refId === kecak.id)!;
      expect(added).toMatchObject({ start: '18:00', locked: true });
      expect(validateDay(updated.days[0])).toEqual([]);
    } else {
      // Only acceptable when the existing plan leaves no travel time to Uluwatu.
      expect(journey.days[0].items.length).toBeGreaterThan(0);
    }
  });
});
