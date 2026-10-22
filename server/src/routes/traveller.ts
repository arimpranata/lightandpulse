import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireRole } from '../auth';
import { applyWebhook, cancelBooking, checkoutSchema, createOrder, travellerLedger } from '../commerce';
import { parse, type Context } from '../context';

const stateSchema = z.object({
  language: z.enum(['en', 'id']),
  profile: z.record(z.string(), z.unknown()).nullable(),
  journey: z.record(z.string(), z.unknown()).nullable(),
  alerts: z.array(z.unknown()).max(200),
  excludedIds: z.array(z.string().max(100)).max(500),
});

export function travellerRoutes(app: FastifyInstance, { db, payments }: Context) {
  /** Profile, journey and settings, so a traveller's plan follows them across devices. */
  app.get('/me/state', async (request) => {
    const user = requireRole(request, 'traveller');
    const { rows } = await db.query('SELECT * FROM traveller_state WHERE user_id = $1', [user.id]);
    const row = rows[0];
    return {
      state: row ? { language: row.language, profile: row.profile, journey: row.journey, alerts: row.alerts, excludedIds: row.excluded_ids } : null,
    };
  });

  app.put('/me/state', async (request) => {
    const user = requireRole(request, 'traveller');
    const state = parse(stateSchema, request.body);
    await db.query(
      `INSERT INTO traveller_state (user_id, language, profile, journey, alerts, excluded_ids, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (user_id) DO UPDATE SET language = $2, profile = $3, journey = $4, alerts = $5, excluded_ids = $6, updated_at = now()`,
      [user.id, state.language, JSON.stringify(state.profile), JSON.stringify(state.journey), JSON.stringify(state.alerts), JSON.stringify(state.excludedIds)],
    );
    return { ok: true };
  });

  /** Orders, child bookings, payments and refunds (spec §13). */
  app.get('/me/orders', async (request) => {
    const user = requireRole(request, 'traveller');
    return { ledger: await travellerLedger(db, user.id) };
  });

  /** Checkout: the traveller has confirmed the order and payment in the app. */
  app.post('/orders', async (request, reply) => {
    const user = requireRole(request, 'traveller');
    const body = parse(checkoutSchema, request.body);
    const result = await createOrder(db, payments, user, body);
    reply.code(201);
    return result;
  });

  app.post('/bookings/:id/cancel', async (request) => {
    const user = requireRole(request, 'traveller', 'admin');
    const { id } = parse(z.object({ id: z.string().max(100) }), request.params);
    return cancelBooking(db, payments, user, id);
  });

  /** Provider callback. Signature-verified and safe to replay. */
  app.post('/payments/webhook', { config: { rateLimit: false } }, async (request) => {
    const event = payments.verifyWebhook(request.rawBody ?? '', request.headers);
    return { result: await applyWebhook(db, event) };
  });
}
