import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { audit, type Actor } from '../audit';
import { hashPassword, requireRole } from '../auth';
import { rowToRule, rowToVendor } from '../catalog';
import { paySettlement, rowToBooking, rowToSettlement } from '../commerce';
import { parse, type Context } from '../context';
import { transaction } from '../db';
import { ApiError } from '../errors';

const idParam = z.object({ id: z.string().max(100) });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ruleSchema = z.object({
  scopeType: z.enum(['global', 'category', 'destination', 'experience', 'event']),
  scopeId: z.string().max(100),
  kind: z.enum(['etiquette', 'dress', 'photography', 'access', 'safety']),
  severity: z.enum(['info', 'warning', 'restricted', 'prohibited']),
  text: z.object({ en: z.string().trim().min(5).max(1000), id: z.string().trim().max(1000).optional() }),
  validFrom: date,
  validTo: date.nullable(),
  sourceOwner: z.string().trim().min(3).max(200),
});

export function adminRoutes(app: FastifyInstance, { db }: Context) {
  const actor = (user: { id: string; role: string }): Actor => ({ id: user.id, role: user.role });

  app.get('/admin/overview', async (request) => {
    requireRole(request, 'admin');
    const [vendors, review, bookings, settlements, auditLog, totals] = await Promise.all([
      db.query('SELECT * FROM vendors ORDER BY name'),
      db.query(`SELECT id, vendor_id, status, data, demo FROM experiences WHERE status = 'submitted' ORDER BY updated_at`),
      db.query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50'),
      db.query(`SELECT * FROM settlements WHERE status IN ('eligible', 'held') ORDER BY updated_at`),
      db.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50'),
      db.query(`SELECT
          (SELECT count(*)::int FROM orders) AS orders,
          (SELECT coalesce(sum(gross), 0) FROM payments WHERE status IN ('paid', 'partially_refunded')) AS gross,
          (SELECT coalesce(sum(refunded), 0) FROM payments) AS refunded,
          (SELECT count(*)::int FROM bookings WHERE status = 'confirmed') AS confirmed`),
    ]);
    return {
      totals: totals.rows[0],
      vendors: vendors.rows.map(rowToVendor),
      review: review.rows.map((r) => ({ ...r.data, demo: r.demo, status: r.status })),
      bookings: bookings.rows.map(rowToBooking),
      settlements: settlements.rows.map(rowToSettlement),
      audit: auditLog.rows.map((r) => ({ id: Number(r.id), at: r.at, actorRole: r.actor_role, source: r.source, action: r.action, entity: r.entity, entityId: r.entity_id })),
    };
  });

  app.post('/admin/vendors/:id/verification', async (request) => {
    const user = requireRole(request, 'admin');
    const { id } = parse(idParam, request.params);
    const { status } = parse(z.object({ status: z.enum(['verified', 'pending', 'suspended']) }), request.body);
    await transaction(db, async (tx) => {
      const before = (await tx.query('SELECT verification_status FROM vendors WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!before) throw new ApiError('NOT_FOUND', 'Vendor not found.');
      await tx.query('UPDATE vendors SET verification_status = $2, updated_at = now() WHERE id = $1', [id, status]);
      await audit(tx, actor(user), { source: 'admin-portal', action: 'vendor.verification', entity: 'vendor', entityId: id, before: { status: before.verification_status }, after: { status } });
    });
    return { ok: true };
  });

  /** Product moderation: submitted → published or rejected. */
  app.post('/admin/experiences/:id/review', async (request) => {
    const user = requireRole(request, 'admin');
    const { id } = parse(idParam, request.params);
    const body = parse(z.object({ decision: z.enum(['approve', 'reject']), note: z.string().max(500).optional() }), request.body);
    await transaction(db, async (tx) => {
      const row = (await tx.query('SELECT status FROM experiences WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!row) throw new ApiError('NOT_FOUND', 'Product not found.');
      if (row.status !== 'submitted') throw new ApiError('INVALID_TRANSITION', `A ${row.status} product cannot be reviewed.`);
      const status = body.decision === 'approve' ? 'published' : 'rejected';
      await tx.query('UPDATE experiences SET status = $2, review_note = $3, updated_at = now() WHERE id = $1', [id, status, body.note ?? null]);
      await audit(tx, actor(user), { source: 'admin-portal', action: `experience.${status}`, entity: 'experience', entityId: id, before: { status: row.status }, after: { status, note: body.note } });
    });
    return { ok: true };
  });

  app.post('/admin/settlements/:id/pay', async (request) => {
    const user = requireRole(request, 'admin');
    await paySettlement(db, user, parse(idParam, request.params).id);
    return { ok: true };
  });

  /** Staff accounts: vendors, cultural reviewers and other admins. */
  app.post('/admin/users', async (request, reply) => {
    const user = requireRole(request, 'admin');
    const body = parse(
      z.object({
        email: z.email().max(200).transform((e) => e.toLowerCase()),
        password: z.string().min(10).max(200),
        name: z.string().trim().min(2).max(120),
        role: z.enum(['vendor', 'admin', 'cultural_reviewer']),
        vendorId: z.string().max(100).optional(),
      }),
      request.body,
    );
    if (body.role === 'vendor' && !body.vendorId) throw new ApiError('VALIDATION_ERROR', 'A vendor account needs a vendor.');
    const hash = await hashPassword(body.password);
    const created = await transaction(db, async (tx) => {
      try {
        const { rows } = await tx.query(
          'INSERT INTO users (email, password_hash, display_name, role, vendor_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [body.email, hash, body.name, body.role, body.role === 'vendor' ? body.vendorId : null],
        );
        await audit(tx, actor(user), { source: 'admin-portal', action: 'user.created', entity: 'user', entityId: rows[0].id, after: { email: body.email, role: body.role, vendorId: body.vendorId } });
        return rows[0].id as string;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') throw new ApiError('CONFLICT', 'An account with this email already exists.');
        if (code === '23503') throw new ApiError('VALIDATION_ERROR', 'Unknown vendor.');
        throw error;
      }
    });
    reply.code(201);
    return { id: created };
  });

  // -------------------------------------------------------------------------
  // Cultural rules (spec §16): admins and cultural reviewers.

  app.get('/cultural/rules', async (request) => {
    requireRole(request, 'admin', 'cultural_reviewer');
    const { rows } = await db.query('SELECT * FROM cultural_rules ORDER BY scope_type, scope_id, id');
    return { rules: rows.map((r) => ({ ...rowToRule(r), verifiedAt: r.verified_at })) };
  });

  app.get('/cultural/rules/:id/versions', async (request) => {
    requireRole(request, 'admin', 'cultural_reviewer');
    const { id } = parse(idParam, request.params);
    const { rows } = await db.query('SELECT version, snapshot, changed_at FROM cultural_rule_versions WHERE rule_id = $1 ORDER BY version DESC', [id]);
    return { versions: rows };
  });

  app.post('/cultural/rules', async (request, reply) => {
    const user = requireRole(request, 'admin', 'cultural_reviewer');
    const rule = parse(ruleSchema.extend({ id: z.string().regex(/^[a-z0-9-]{3,60}$/) }), request.body);
    await transaction(db, async (tx) => {
      try {
        await tx.query(
          `INSERT INTO cultural_rules (id, scope_type, scope_id, kind, severity, text_en, text_id, valid_from, valid_to, source_owner, version, verified, demo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, false, false)`,
          [rule.id, rule.scopeType, rule.scopeId, rule.kind, rule.severity, rule.text.en, rule.text.id ?? null, rule.validFrom, rule.validTo, rule.sourceOwner],
        );
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new ApiError('CONFLICT', 'A rule with this id already exists.');
        throw error;
      }
      await snapshot(tx, rule.id, user.id);
      await audit(tx, actor(user), { source: 'admin-portal', action: 'cultural_rule.created', entity: 'cultural_rule', entityId: rule.id, after: rule });
    });
    reply.code(201);
    return { ok: true };
  });

  /** Any edit creates a new version and clears verification until it is checked again. */
  app.put('/cultural/rules/:id', async (request) => {
    const user = requireRole(request, 'admin', 'cultural_reviewer');
    const { id } = parse(idParam, request.params);
    const rule = parse(ruleSchema, request.body);
    await transaction(db, async (tx) => {
      const before = (await tx.query('SELECT * FROM cultural_rules WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!before) throw new ApiError('NOT_FOUND', 'Rule not found.');
      await tx.query(
        `UPDATE cultural_rules SET scope_type = $2, scope_id = $3, kind = $4, severity = $5, text_en = $6, text_id = $7, valid_from = $8,
                valid_to = $9, source_owner = $10, version = version + 1, verified = false, verified_by = NULL, verified_at = NULL, updated_at = now()
          WHERE id = $1`,
        [id, rule.scopeType, rule.scopeId, rule.kind, rule.severity, rule.text.en, rule.text.id ?? null, rule.validFrom, rule.validTo, rule.sourceOwner],
      );
      await snapshot(tx, id, user.id);
      await audit(tx, actor(user), { source: 'admin-portal', action: 'cultural_rule.updated', entity: 'cultural_rule', entityId: id, before: rowToRule(before), after: rule });
    });
    return { ok: true };
  });

  app.post('/cultural/rules/:id/verify', async (request) => {
    const user = requireRole(request, 'admin', 'cultural_reviewer');
    const { id } = parse(idParam, request.params);
    await transaction(db, async (tx) => {
      const updated = await tx.query(
        'UPDATE cultural_rules SET verified = true, verified_by = $2, verified_at = now(), updated_at = now() WHERE id = $1 AND NOT verified RETURNING version',
        [id, user.id],
      );
      if (!updated.rowCount) throw new ApiError('INVALID_TRANSITION', 'Rule not found or already verified.');
      await audit(tx, actor(user), { source: 'admin-portal', action: 'cultural_rule.verified', entity: 'cultural_rule', entityId: id, after: { version: updated.rows[0].version } });
    });
    return { ok: true };
  });
}

async function snapshot(tx: import('../db').Tx, ruleId: string, userId: string) {
  const row = (await tx.query('SELECT * FROM cultural_rules WHERE id = $1', [ruleId])).rows[0];
  await tx.query('INSERT INTO cultural_rule_versions (rule_id, version, snapshot, changed_by) VALUES ($1, $2, $3, $4)', [
    ruleId,
    row.version,
    JSON.stringify(rowToRule(row)),
    userId,
  ]);
}
