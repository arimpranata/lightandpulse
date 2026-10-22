import type {
  BaliEvent,
  CulturalRule,
  Destination,
  Experience,
  Inventory,
  RuleSeverity,
} from './types';

export type GuardianDecision = 'pass' | 'pass_with_notes' | 'modify' | 'block';

export type GuardianResult = {
  decision: GuardianDecision;
  rules: CulturalRule[];
  /** Rules the traveller must acknowledge before booking or navigating. */
  requiresAcknowledgement: CulturalRule[];
};

export type RuleTarget =
  | { kind: 'destination'; item: Destination }
  | { kind: 'experience'; item: Experience }
  | { kind: 'event'; item: BaliEvent };

const SEVERITY_ORDER: Record<RuleSeverity, number> = {
  info: 0,
  warning: 1,
  restricted: 2,
  prohibited: 3,
};

export function isRuleActive(rule: CulturalRule, date: string): boolean {
  if (date < rule.validFrom) return false;
  return rule.validTo === null || date <= rule.validTo;
}

/** Destinations an item takes place at, so destination rules also apply to it. */
function linkedDestinations(target: RuleTarget, inventory: Inventory): Destination[] {
  if (target.kind === 'destination') return [target.item];
  const ids =
    target.kind === 'experience'
      ? target.item.destinationIds
      : target.item.venue.destinationId
        ? [target.item.venue.destinationId]
        : [];
  return inventory.destinations.filter((destination) => ids.includes(destination.id));
}

/**
 * get_cultural_rules (spec §24): every rule in force for an item on a date,
 * strongest first. Rules come only from the rules dataset; nothing is inferred.
 */
export function rulesFor(target: RuleTarget, date: string, inventory: Inventory): CulturalRule[] {
  const destinations = linkedDestinations(target, inventory);
  const categories = new Set(destinations.map((destination) => destination.category));
  const destinationIds = new Set(destinations.map((destination) => destination.id));

  return inventory.rules
    .filter((rule) => isRuleActive(rule, date))
    .filter((rule) => {
      switch (rule.scopeType) {
        case 'global':
          // Island-wide guidance is shown on the Cultural Code screen, not per item.
          return false;
        case 'category':
          return categories.has(rule.scopeId);
        case 'destination':
          return destinationIds.has(rule.scopeId);
        case 'experience':
          return target.kind === 'experience' && target.item.id === rule.scopeId;
        case 'event':
          return target.kind === 'event' && target.item.id === rule.scopeId;
      }
    })
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
}

/** Island-wide rules in force on a date (Cultural Code screen, home tips). */
export function globalRules(date: string, inventory: Inventory): CulturalRule[] {
  return inventory.rules.filter((rule) => rule.scopeType === 'global' && isRuleActive(rule, date));
}

/**
 * Cultural Guardian gate (spec §16). PROHIBITED blocks the item; RESTRICTED keeps
 * it but changes what the visit can include and needs acknowledgement; WARNING
 * needs acknowledgement before booking or navigation; INFO is shown as context.
 */
export function evaluate(target: RuleTarget, date: string, inventory: Inventory): GuardianResult {
  const rules = rulesFor(target, date, inventory);
  const strongest = rules[0]?.severity;
  const requiresAcknowledgement = rules.filter(
    (rule) => rule.severity === 'warning' || rule.severity === 'restricted',
  );
  let decision: GuardianDecision = 'pass';
  if (strongest === 'prohibited') decision = 'block';
  else if (strongest === 'restricted') decision = 'modify';
  else if (rules.length > 0) decision = 'pass_with_notes';
  return { decision, rules, requiresAcknowledgement };
}

/** 0–1 compatibility used by ranking; blocked items never reach ranking. */
export function culturalCompatibility(result: GuardianResult): number {
  switch (result.decision) {
    case 'pass':
      return 1;
    case 'pass_with_notes':
      return result.requiresAcknowledgement.length > 0 ? 0.85 : 0.95;
    case 'modify':
      return 0.6;
    case 'block':
      return 0;
  }
}
