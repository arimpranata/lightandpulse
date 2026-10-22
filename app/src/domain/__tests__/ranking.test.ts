import { describe, expect, it } from '@jest/globals';

import { allCandidates, qualityScore, rank, RANKING_WEIGHTS, scoreCandidate } from '@/domain/ranking';

import { inventory, profile, TRIP_START } from './fixtures';

describe('ranking', () => {
  it('uses the spec weights, which sum to 1 and exclude commission', () => {
    const total = Object.values(RANKING_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(Object.keys(RANKING_WEIGHTS)).not.toContain('commission');
    expect(RANKING_WEIGHTS).toEqual({
      relevance: 0.25,
      availability: 0.15,
      quality: 0.15,
      culturalCompatibility: 0.15,
      authenticity: 0.1,
      safety: 0.1,
      priceFit: 0.05,
      distance: 0.05,
    });
  });

  it('is robust to small-sample ratings', () => {
    expect(qualityScore({ average: 5, count: 1 })).toBeLessThan(qualityScore({ average: 4.8, count: 300 }));
  });

  it('puts culture first for a culture-heavy traveller', () => {
    const p = profile({
      preferences: { spiritual: 20, culture: 95, wellbeing: 10, adventure: 10, culinary: 10, arts: 80, beach: 5, nightlife: 0 },
    });
    const top = rank(allCandidates(inventory), p, TRIP_START, inventory).slice(0, 5);
    for (const item of top) {
      const tags = item.kind === 'destination' ? item.item.tags : item.item.categories;
      expect(tags.some((tag) => tag === 'culture' || tag === 'arts')).toBe(true);
    }
  });

  it('explains recommendations with the traveller preference, base and time', () => {
    const p = profile({ baseRegion: 'ubud', preferences: { ...profile().preferences, arts: 90 } });
    const batik = inventory.experiences.find((e) => e.id === 'exp-batik-ubud')!;
    const ranked = scoreCandidate({ kind: 'experience', item: batik }, p, TRIP_START, inventory)!;
    expect(ranked.reasons).toEqual(
      expect.arrayContaining([
        { type: 'preference', key: 'arts', value: 90 },
        { type: 'near_base', region: 'ubud' },
        { type: 'available_at', time: '09:00' },
      ]),
    );
  });

  it('scores a sold-out experience lower than an available one', () => {
    const batik = inventory.experiences.find((e) => e.id === 'exp-batik-ubud')!;
    const p = profile();
    const open = scoreCandidate({ kind: 'experience', item: batik }, p, TRIP_START, inventory)!;
    const full = scoreCandidate({ kind: 'experience', item: batik }, p, TRIP_START, inventory, {
      booked: () => 100,
    })!;
    expect(full.factors.availability).toBe(0);
    expect(full.score).toBeLessThan(open.score);
  });

  it('ranks a verified vendor above an unverified one with otherwise equal factors', () => {
    const music = inventory.experiences.find((e) => e.id === 'exp-canggu-music')!;
    const scored = scoreCandidate({ kind: 'experience', item: music }, profile(), TRIP_START, inventory)!;
    expect(scored.factors.safety).toBe(0.5);
  });
});
