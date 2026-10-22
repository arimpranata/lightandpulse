import { GUIDE } from '@/data/guide';
import { ITINERARIES } from '@/data/itineraries';
import { CATEGORIES, PLACES, REGIONS } from '@/data/places';
import { DEMO_MARKETPLACE } from '@/demo';

import { hashPassword } from './auth';
import type { Config } from './config';
import { transaction, type Db } from './db';

export const DEMO_VENDOR_EMAIL = 'demo-vendor@balilens.local';
const DEMO_VENDOR_ID = 'ven-ubud-arts';

/**
 * Loads the bundled destination and guide content and, unless SEED_DEMO=false,
 * the DEMO marketplace (records flagged demo=true, spec §34). Existing rows are
 * never overwritten, so edits made in the admin portal survive a restart.
 */
export async function seed(db: Db, config: Config, log: (message: string) => void = console.log): Promise<void> {
  await transaction(db, async (tx) => {
    for (const [index, category] of CATEGORIES.entries()) {
      await tx.query(
        `INSERT INTO categories (id, label, icon, color_from, color_to, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [category.id, category.label, category.icon, category.gradient[0], category.gradient[1], index],
      );
    }
    for (const [index, [id, label]] of Object.entries(REGIONS).entries()) {
      await tx.query('INSERT INTO regions (id, label, sort_order) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [id, label, index]);
    }
    for (const [index, p] of PLACES.entries()) {
      await tx.query(
        `INSERT INTO destinations (id, name, tagline, category_id, region_id, area, description, best_time, hours, fee, duration,
                                   latitude, longitude, highlights, tips, featured, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.tagline, p.category, p.region, p.area, p.description, p.bestTime, p.hours, p.fee, p.duration,
          p.coordinates.latitude, p.coordinates.longitude, JSON.stringify(p.highlights), JSON.stringify(p.tips), p.featured ?? false, index],
      );
    }
    await tx.query(
      `INSERT INTO content_documents (key, body) VALUES ('itineraries', $1), ('guide', $2) ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(ITINERARIES), JSON.stringify(GUIDE)],
    );

    if (config.seedDemo) {
      const m = DEMO_MARKETPLACE;
      for (const v of m.vendors) {
        await tx.query(
          `INSERT INTO vendors (id, name, verification_status, service_types, service_area, community_owned, demo)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [v.id, v.name, v.verificationStatus, v.serviceTypes, v.serviceArea, v.communityOwned, v.demo],
        );
      }
      for (const x of m.experiences) {
        await tx.query(`INSERT INTO experiences (id, vendor_id, status, data, demo) VALUES ($1, $2, 'published', $3, $4) ON CONFLICT (id) DO NOTHING`, [x.id, x.vendorId, JSON.stringify(x), x.demo]);
      }
      for (const e of m.events) {
        await tx.query(`INSERT INTO events (id, organizer_id, status, data, demo) VALUES ($1, $2, 'published', $3, $4) ON CONFLICT (id) DO NOTHING`, [e.id, e.organizerId, JSON.stringify(e), e.demo]);
      }
      for (const g of m.guides) {
        await tx.query('INSERT INTO guides (id, vendor_id, data, demo) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [g.id, g.vendorId, JSON.stringify(g), g.demo]);
      }
      for (const d of m.drivers) {
        await tx.query('INSERT INTO drivers (id, operator_id, data, demo) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [d.id, d.operatorId, JSON.stringify(d), d.demo]);
      }
      for (const r of m.rules) {
        const inserted = await tx.query(
          `INSERT INTO cultural_rules (id, scope_type, scope_id, kind, severity, text_en, text_id, valid_from, valid_to, source_owner, version, verified, demo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING RETURNING id`,
          [r.id, r.scopeType, r.scopeId ?? '', r.kind, r.severity, r.text.en, r.text.id ?? null, r.validFrom, r.validTo, r.sourceOwner, r.version, r.verified, r.demo],
        );
        if (inserted.rowCount) {
          await tx.query('INSERT INTO cultural_rule_versions (rule_id, version, snapshot) VALUES ($1, $2, $3)', [r.id, r.version, JSON.stringify(r)]);
        }
      }
      log(`seeded demo marketplace (${m.experiences.length} experiences, ${m.events.length} events, ${m.rules.length} rules)`);

      if (config.demoVendorPassword) {
        await tx.query(
          `INSERT INTO users (email, password_hash, display_name, role, vendor_id) VALUES ($1, $2, 'Demo vendor', 'vendor', $3) ON CONFLICT (email) DO NOTHING`,
          [DEMO_VENDOR_EMAIL, await hashPassword(config.demoVendorPassword), DEMO_VENDOR_ID],
        );
      }
    }

    if (config.adminEmail && config.adminPassword) {
      const created = await tx.query(
        `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, 'Administrator', 'admin') ON CONFLICT (email) DO NOTHING RETURNING id`,
        [config.adminEmail.toLowerCase(), await hashPassword(config.adminPassword)],
      );
      if (created.rowCount) log(`created admin account ${config.adminEmail}`);
    }
  });
}
