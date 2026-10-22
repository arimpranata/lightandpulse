import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { addDays } from '@/domain/time';

import { bookedRows, loadContent, loadMarketplace } from '../catalog';
import { parse, type Context } from '../context';
import { ApiError } from '../errors';

const MAX_RANGE_DAYS = 60;

export function publicRoutes(app: FastifyInstance, { db, payments }: Context) {
  app.get('/health', async () => {
    await db.query('SELECT 1');
    return { ok: true };
  });

  app.get('/content', async () => loadContent(db));

  /** Bookable marketplace inventory and the payment options on offer. */
  app.get('/inventory', async () => ({
    marketplace: await loadMarketplace(db),
    paymentMethods: payments.paymentOptions('IDR'),
    demoPayments: payments.isDemo,
  }));

  /** Seats and services held by live bookings (spec §24 check_availability). */
  app.get('/availability', async (request) => {
    const query = parse(
      z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
      request.query,
    );
    if (query.to < query.from || addDays(query.from, MAX_RANGE_DAYS) < query.to) {
      throw new ApiError('VALIDATION_ERROR', `Choose a range of up to ${MAX_RANGE_DAYS} days.`);
    }
    return { booked: await bookedRows(db, query.from, query.to) };
  });
}
