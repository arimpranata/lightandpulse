import { describe, expect, it } from '@jest/globals';

import { evaluate, globalRules, isRuleActive, rulesFor } from '@/domain/cultural';
import { allCandidates, rank } from '@/domain/ranking';
import type { CulturalRule, Inventory } from '@/domain/types';

import { inventory, profile, TRIP_START } from './fixtures';

const destination = (id: string) => inventory.destinations.find((d) => d.id === id)!;
const experience = (id: string) => inventory.experiences.find((e) => e.id === id)!;

describe('Cultural Guardian', () => {
  it('blocks an experience with a PROHIBITED rule', () => {
    const result = evaluate({ kind: 'experience', item: experience('exp-village-ceremony') }, TRIP_START, inventory);
    expect(result.decision).toBe('block');
  });

  it('never returns a blocked experience as a recommendation', () => {
    const ranked = rank(allCandidates(inventory), profile({ preferences: { ...profile().preferences, spiritual: 100 } }), TRIP_START, inventory);
    expect(ranked.map((r) => r.item.id)).not.toContain('exp-village-ceremony');
  });

  it('marks a destination with a RESTRICTED rule as modified and requiring acknowledgement', () => {
    const result = evaluate({ kind: 'destination', item: destination('tanah-lot') }, TRIP_START, inventory);
    expect(result.decision).toBe('modify');
    expect(result.requiresAcknowledgement.map((r) => r.id)).toEqual(
      expect.arrayContaining(['cr-tanah-lot-inner', 'cr-temple-dress']),
    );
  });

  it('applies destination and category rules to experiences held there', () => {
    const rules = rulesFor({ kind: 'experience', item: experience('exp-melukat-tirta') }, TRIP_START, inventory);
    const ids = rules.map((r) => r.id);
    expect(ids).toContain('cr-tirta-spouts');
    expect(ids).toContain('cr-temple-dress');
    expect(rules[0].severity).toBe('restricted');
  });

  it('passes an item with no rules', () => {
    const result = evaluate({ kind: 'experience', item: experience('exp-batik-ubud') }, TRIP_START, inventory);
    expect(result.decision).toBe('pass');
  });

  it('keeps island-wide rules out of item evaluation', () => {
    expect(globalRules(TRIP_START, inventory).map((r) => r.id)).toContain('cr-nyepi');
    const rules = rulesFor({ kind: 'destination', item: destination('seminyak') }, TRIP_START, inventory);
    expect(rules.find((r) => r.scopeType === 'global')).toBeUndefined();
  });

  it('respects validity dates', () => {
    const base = inventory.rules[0];
    const expired: CulturalRule = { ...base, validFrom: '2026-01-01', validTo: '2026-12-31' };
    expect(isRuleActive(expired, '2026-12-31')).toBe(true);
    expect(isRuleActive(expired, '2027-01-01')).toBe(false);
    const future: CulturalRule = { ...base, validFrom: '2027-06-01' };
    expect(isRuleActive(future, TRIP_START)).toBe(false);
  });

  it('unblocks an item once its prohibition ends', () => {
    const lifted: Inventory = {
      ...inventory,
      rules: inventory.rules.map((r) => (r.id === 'cr-demo-ceremony-paused' ? { ...r, validTo: '2027-03-01' } : r)),
    };
    const result = evaluate({ kind: 'experience', item: experience('exp-village-ceremony') }, TRIP_START, lifted);
    expect(result.decision).not.toBe('block');
  });
});
