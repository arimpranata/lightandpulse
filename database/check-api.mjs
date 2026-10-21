#!/usr/bin/env node
// Smoke-tests a deployed API: checks /health, then compares /content with the
// app's bundled data in app/src/data (they match right after importing seed.sql).
//
//   node database/check-api.mjs https://your-domain.com/api

import { deepStrictEqual } from 'node:assert';

import { CURRENCIES, EMERGENCY, ESSENTIALS, ETIQUETTE, PHRASES } from '../app/src/data/guide.ts';
import { ITINERARIES } from '../app/src/data/itineraries.ts';
import { CATEGORIES, PLACES, REGIONS } from '../app/src/data/places.ts';

const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('Usage: node database/check-api.mjs https://your-domain.com/api');
  process.exit(1);
}

async function get(path) {
  const response = await fetch(base + path);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status} ${JSON.stringify(body)}`);
  return body;
}

// JSON round-trip drops `undefined` fields, matching what the API returns.
const plain = (value) => JSON.parse(JSON.stringify(value));

const health = await get('/health');
console.log('health:', health.status, health.database);

const content = await get('/content');
const expected = plain({
  categories: CATEGORIES,
  regions: REGIONS,
  places: PLACES.map((place) => ({ ...place, featured: Boolean(place.featured) })),
  itineraries: ITINERARIES,
  guide: { currencies: CURRENCIES, phrases: PHRASES, essentials: ESSENTIALS, etiquette: ETIQUETTE, emergency: EMERGENCY },
});

let differences = 0;
for (const key of Object.keys(expected)) {
  try {
    deepStrictEqual(content[key], expected[key]);
    console.log(`content.${key}: matches bundled data`);
  } catch (error) {
    differences++;
    console.log(`content.${key}: differs from bundled data (fine if you edited the database)`);
    console.log(error.message.split('\n').slice(0, 12).join('\n'));
  }
}
console.log(differences === 0 ? 'OK' : `${differences} section(s) differ`);
