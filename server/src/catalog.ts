import type { Marketplace } from '@/demo';
import { toDestination } from '@/demo/inventory';
import type { BookedRow } from '@/domain/availability';
import type {
  BaliEvent,
  CulturalRule,
  DriverService,
  Experience,
  Guide,
  Inventory,
  Vendor,
} from '@/domain/types';
import type { Place } from '@/data/places';

import type { Db, Tx } from './db';

type Queryable = Db | Tx;

/** Public content in the shape the app's ContentProvider expects (GET /content). */
export async function loadContent(db: Queryable) {
  const [categories, regions, places, docs] = await Promise.all([
    db.query('SELECT id, label, icon, color_from, color_to FROM categories ORDER BY sort_order, id'),
    db.query('SELECT id, label FROM regions ORDER BY sort_order, id'),
    db.query(`SELECT * FROM destinations WHERE published ORDER BY sort_order, name`),
    db.query(`SELECT key, body FROM content_documents WHERE key IN ('itineraries', 'guide')`),
  ]);
  const doc = (key: string) => docs.rows.find((row) => row.key === key)?.body;
  return {
    categories: categories.rows.map((r) => ({ id: r.id, label: r.label, icon: r.icon, gradient: [r.color_from, r.color_to] })),
    regions: Object.fromEntries(regions.rows.map((r) => [r.id, r.label])) as Record<string, string>,
    places: places.rows.map(rowToPlace),
    itineraries: doc('itineraries') ?? [],
    guide: doc('guide') ?? { currencies: [], phrases: [], essentials: [], etiquette: [], emergency: [] },
  };
}

export function rowToPlace(r: Record<string, any>): Place {
  return {
    id: r.id,
    name: r.name,
    tagline: r.tagline,
    category: r.category_id,
    region: r.region_id,
    area: r.area,
    description: r.description,
    highlights: r.highlights,
    tips: r.tips,
    bestTime: r.best_time,
    hours: r.hours,
    fee: r.fee,
    duration: r.duration,
    coordinates: { latitude: Number(r.latitude), longitude: Number(r.longitude) },
    featured: r.featured,
  };
}

export function rowToRule(r: Record<string, any>): CulturalRule {
  return {
    id: r.id,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
    kind: r.kind,
    severity: r.severity,
    text: r.text_id ? { en: r.text_en, id: r.text_id } : { en: r.text_en },
    validFrom: r.valid_from,
    validTo: r.valid_to,
    sourceOwner: r.source_owner,
    version: r.version,
    verified: r.verified,
    demo: r.demo,
  };
}

export function rowToVendor(r: Record<string, any>): Vendor {
  return {
    id: r.id,
    name: r.name,
    verificationStatus: r.verification_status,
    serviceTypes: r.service_types,
    serviceArea: r.service_area,
    communityOwned: r.community_owned,
    demo: r.demo,
  };
}

/**
 * Marketplace inventory travellers may see: published products of vendors that
 * are not suspended. `includeAll` returns every record, for staff tools.
 */
export async function loadMarketplace(db: Queryable, options: { includeAll?: boolean } = {}): Promise<Marketplace> {
  const visible = options.includeAll ? '' : `WHERE x.status = 'published' AND v.verification_status <> 'suspended'`;
  const [experiences, events, vendors, guides, drivers, rules] = await Promise.all([
    db.query(`SELECT x.data, x.demo FROM experiences x JOIN vendors v ON v.id = x.vendor_id ${visible} ORDER BY x.id`),
    db.query(`SELECT x.data, x.demo FROM events x JOIN vendors v ON v.id = x.organizer_id ${visible} ORDER BY x.id`),
    db.query(`SELECT * FROM vendors ORDER BY id`),
    db.query(`SELECT data, demo FROM guides ORDER BY id`),
    db.query(`SELECT data, demo FROM drivers ORDER BY id`),
    db.query(`SELECT * FROM cultural_rules ORDER BY id`),
  ]);
  return {
    experiences: experiences.rows.map((r) => ({ ...r.data, demo: r.demo }) as Experience),
    events: events.rows.map((r) => ({ ...r.data, demo: r.demo }) as BaliEvent),
    vendors: vendors.rows.map(rowToVendor),
    guides: guides.rows.map((r) => ({ ...r.data, demo: r.demo }) as Guide),
    drivers: drivers.rows.map((r) => ({ ...r.data, demo: r.demo }) as DriverService),
    rules: rules.rows.map(rowToRule),
  };
}

export async function loadInventory(db: Queryable): Promise<Inventory> {
  const [content, marketplace] = await Promise.all([loadContent(db), loadMarketplace(db)]);
  return { destinations: content.places.map(toDestination), ...marketplace, regions: content.regions };
}

// ---------------------------------------------------------------------------
// Availability

/**
 * Seats and services held by live bookings between two dates. Keys match the
 * domain's BookedLookup: experience id (per time), "event:ticket" (per date),
 * guide or driver id (one booking per day).
 */
export async function bookedRows(db: Queryable, from: string, to: string): Promise<BookedRow[]> {
  const { rows } = await db.query(
    `SELECT item_type, item_id, variant_id, service_date, service_time,
            SUM(participants)::int AS seats, COUNT(*)::int AS bookings
       FROM bookings
      WHERE status IN ('pending', 'confirmed') AND service_date BETWEEN $1 AND $2
      GROUP BY item_type, item_id, variant_id, service_date, service_time`,
    [from, to],
  );
  return rows.map((r) => {
    if (r.item_type === 'experience') return { key: r.item_id, date: r.service_date, time: r.service_time, count: r.seats };
    if (r.item_type === 'event_ticket') return { key: `${r.item_id}:${r.variant_id}`, date: r.service_date, time: null, count: r.seats };
    return { key: r.item_id, date: r.service_date, time: null, count: r.bookings };
  });
}
