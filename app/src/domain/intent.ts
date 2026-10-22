import { clampProfile } from './profile';
import type { PreferenceKey, TravellerProfile } from './types';

/**
 * Keyword intent parser for the Journey Builder prompt (English and Bahasa
 * Indonesia). It only adjusts the traveller's own constraints; planning still
 * runs on structured inventory. A conversational model can replace this once
 * an AI provider is chosen (decision D-009).
 */

export type IntentChange =
  | { type: 'preference'; key: PreferenceKey; delta: number }
  | { type: 'pace'; delta: number }
  | { type: 'budget'; delta: number }
  | { type: 'style'; delta: number }
  | { type: 'days'; value: number };

const PREFERENCE_WORDS: Record<PreferenceKey, string[]> = {
  spiritual: ['spiritual', 'temple', 'temples', 'pura', 'ritual', 'meditation', 'meditasi'],
  culture: ['culture', 'cultural', 'tradition', 'budaya', 'tradisi', 'heritage', 'village', 'desa'],
  wellbeing: ['wellness', 'wellbeing', 'yoga', 'spa', 'massage', 'pijat', 'relax', 'kesehatan'],
  adventure: ['adventure', 'hike', 'hiking', 'trek', 'nature', 'alam', 'petualangan', 'waterfall', 'waterfalls', 'air terjun'],
  culinary: ['food', 'culinary', 'cooking', 'kuliner', 'makan', 'masak', 'dining'],
  arts: ['art', 'arts', 'craft', 'crafts', 'seni', 'kerajinan', 'workshop'],
  beach: ['beach', 'beaches', 'pantai', 'snorkel', 'snorkelling', 'surf', 'island', 'pulau'],
  nightlife: ['nightlife', 'party', 'bar', 'bars', 'music', 'musik', 'hiburan malam'],
};

const NEGATIONS = ['less', 'fewer', 'no', 'without', 'skip', 'kurangi', 'tanpa', 'jangan', 'sedikit'];

function mentions(text: string, word: string): number {
  const pattern = new RegExp(`(^|[^a-z])${word.replace(/ /g, '\\s+')}([^a-z]|$)`, 'i');
  const match = text.match(pattern);
  return match?.index ?? -1;
}

function negated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 14), index + 1);
  return NEGATIONS.some((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'i').test(before));
}

export function parseIntent(prompt: string): IntentChange[] {
  const text = ` ${prompt.toLowerCase()} `;
  const changes: IntentChange[] = [];

  for (const [key, words] of Object.entries(PREFERENCE_WORDS) as [PreferenceKey, string[]][]) {
    const hit = words.map((word) => mentions(text, word)).find((index) => index >= 0);
    if (hit !== undefined) changes.push({ type: 'preference', key, delta: negated(text, hit) ? -30 : 25 });
  }

  if (/(slow|slower|relaxed|santai|pelan|tenang)/.test(text)) changes.push({ type: 'pace', delta: -25 });
  else if (/(packed|busy|more activities|padat|lebih banyak aktivitas)/.test(text)) changes.push({ type: 'pace', delta: 25 });

  if (/(cheap|cheaper|budget|save money|hemat|murah)/.test(text)) changes.push({ type: 'budget', delta: -25 });
  if (/(luxury|premium|mewah)/.test(text)) {
    changes.push({ type: 'style', delta: 25 });
    changes.push({ type: 'budget', delta: 15 });
  } else if (/(local|authentic|lokal|otentik|autentik)/.test(text)) {
    changes.push({ type: 'style', delta: -25 });
  }

  const days = text.match(/(\d{1,2})\s*(days?|hari)/);
  if (days) changes.push({ type: 'days', value: Number(days[1]) });

  return changes;
}

export function applyIntent(profile: TravellerProfile, changes: IntentChange[]): TravellerProfile {
  const next: TravellerProfile = { ...profile, preferences: { ...profile.preferences } };
  for (const change of changes) {
    switch (change.type) {
      case 'preference':
        next.preferences[change.key] += change.delta;
        break;
      case 'pace':
        next.pace += change.delta;
        break;
      case 'budget':
        next.budget += change.delta;
        break;
      case 'style':
        next.localLuxury += change.delta;
        break;
      case 'days':
        next.tripDays = change.value;
        break;
    }
  }
  return clampProfile(next);
}
