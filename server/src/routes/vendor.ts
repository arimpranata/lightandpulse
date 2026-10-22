import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { audit } from '../audit';
import { requireRole } from '../auth';
import { rowToVendor } from '../catalog';
import { closeBooking, rowToBooking, rowToSettlement } from '../commerce';
import { parse, type Context } from '../context';
import { transaction } from '../db';
import { ApiError } from '../errors';

const idParam = z.object({ id: z.string().max(100) });

/** Fields a vendor may change; any change goes back to admin review (spec §18, §33). */
export const productEditSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(1000),
  price: z.number().int().min(0).max(100_000_000),
  capacity: z.number().int().min(1).max(500),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(12),
  durationMin: z.number().int().min(15).max(24 * 60),
  meetingPoint: z.string().trim().min(3).max(300),
  freeCancellationHours: z.number().int().min(0).max(24 * 30),
});

export function vendorRoutes(app: FastifyInstance, { db }: Context) {
  /** Vendor portal: profile, products, bookings and payouts for the signed-in vendor only. */
  app.get('/vendor/overview', async (request) => {
    const user = requireRole(request, 'vendor');
    const [vendor, experiences, bookings, settlements] = await Promise.all([
      db.query('SELECT * FROM vendors WHERE id = $1', [user.vendorId]),
      db.query('SELECT id, status, data, demo, review_note FROM experiences WHERE vendor_id = $1 ORDER BY id', [user.vendorId]),
      db.query('SELECT * FROM bookings WHERE supplier_id = $1 ORDER BY service_date DESC, service_time DESC LIMIT 200', [user.vendorId]),
      db.query('SELECT * FROM settlements WHERE supplier_id = $1 ORDER BY updated_at DESC LIMIT 200', [user.vendorId]),
    ]);
    return {
      vendor: vendor.rows[0] ? rowToVendor(vendor.rows[0]) : null,
      experiences: experiences.rows.map((r) => ({ ...r.data, demo: r.demo, status: r.status, reviewNote: r.review_note })),
      bookings: bookings.rows.map(rowToBooking),
      settlements: settlements.rows.map(rowToSettlement),
    };
  });

  app.post('/vendor/bookings/:id/complete', async (request) => {
    const user = requireRole(request, 'vendor');
    await closeBooking(db, user, parse(idParam, request.params).id, 'completed');
    return { ok: true };
  });

  app.post('/vendor/bookings/:id/no-show', async (request) => {
    const user = requireRole(request, 'vendor');
    await closeBooking(db, user, parse(idParam, request.params).id, 'no_show');
    return { ok: true };
  });

  app.put('/vendor/experiences/:id', async (request) => {
    const user = requireRole(request, 'vendor');
    const { id } = parse(idParam, request.params);
    const edit = parse(productEditSchema, request.body);
    await transaction(db, async (tx) => {
      const row = (await tx.query('SELECT * FROM experiences WHERE id = $1 AND vendor_id = $2 FOR UPDATE', [id, user.vendorId])).rows[0];
      if (!row) throw new ApiError('NOT_FOUND', 'Product not found.');
      const data = {
        ...row.data,
        title: edit.title,
        summary: edit.summary,
        price: { amount: edit.price, currency: 'IDR' },
        capacity: edit.capacity,
        slots: [...new Set(edit.slots)].sort(),
        durationMin: edit.durationMin,
        meetingPoint: edit.meetingPoint,
        cancellationPolicy: { freeCancellationHours: edit.freeCancellationHours },
      };
      await tx.query(`UPDATE experiences SET data = $2, status = 'submitted', review_note = NULL, updated_at = now() WHERE id = $1`, [id, JSON.stringify(data)]);
      await audit(tx, { id: user.id, role: user.role }, { source: 'vendor-portal', action: 'experience.submitted', entity: 'experience', entityId: id, before: row.data, after: data });
    });
    return { ok: true, status: 'submitted' };
  });
}
