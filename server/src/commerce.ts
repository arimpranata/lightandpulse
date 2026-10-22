import { randomInt } from 'node:crypto';

import { z } from 'zod';

import {
  eventAvailability,
  experienceAvailability,
  lookupFromRows,
  serviceAvailability,
  type BookedLookup,
} from '@/domain/availability';
import { driverLine, eventLine, experienceLine, guideLine } from '@/domain/cart-lines';
import {
  applyPaymentEvent,
  assertTransition,
  BOOKING_TRANSITIONS,
  cancelBooking as cancelInLedger,
  createOrder as createOrderInLedger,
  EMPTY_LEDGER,
  InvalidTransitionError,
  SETTLEMENT_TRANSITIONS,
  type Ledger,
  type PaymentEvent,
} from '@/domain/commerce';
import { evaluate } from '@/domain/cultural';
import type { AuditEvent, Booking, Cart, CartLine, Inventory, Order, Payment, Refund, Settlement } from '@/domain/types';

import { audit, SYSTEM, type Actor } from './audit';
import type { AuthUser } from './auth';
import { bookedRows, loadInventory } from './catalog';
import { transaction, type Db, type Tx } from './db';
import { ApiError } from './errors';
import type { PaymentProvider } from './payments';

// ---------------------------------------------------------------------------
// IDs: unambiguous characters, cryptographically random.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newId(prefix: string, length = 12): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${out}`;
}

// ---------------------------------------------------------------------------
// Checkout input

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  traveller: z.object({ name: z.string().trim().min(2).max(120), email: z.email().max(200) }),
  method: z.enum(['card', 'qris', 'bank_transfer', 'ewallet']),
  simulateFailure: z.boolean().optional(),
  /** Community rules the traveller acknowledged at checkout (spec §16). */
  acknowledgedRuleIds: z.array(z.string().max(100)).max(100).default([]),
  lines: z
    .array(
      z.object({
        itemType: z.enum(['experience', 'event_ticket', 'guide', 'driver']),
        itemId: z.string().min(1).max(100),
        variantId: z.string().max(100).optional(),
        date,
        time: time.optional(),
        participants: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
});
export type CheckoutRequest = z.infer<typeof checkoutSchema>;

type LineRequest = CheckoutRequest['lines'][number];

/**
 * Prices a requested line from the inventory record (client prices are never
 * trusted) and applies the Cultural Guardian gate (spec §16).
 */
function priceLine(request: LineRequest, inventory: Inventory, acknowledged: Set<string>): Omit<CartLine, 'id'> {
  const unavailable = () => new ApiError('BOOKING_UNAVAILABLE', 'An item in your cart is no longer available.', { itemId: request.itemId });
  const blocked = (target: Parameters<typeof evaluate>[0]) => {
    const result = evaluate(target, request.date, inventory);
    if (result.decision === 'block') {
      throw new ApiError('CULTURAL_RESTRICTION', 'A community rule currently blocks this item.', { itemId: request.itemId });
    }
    const missing = result.requiresAcknowledgement.filter((rule) => !acknowledged.has(rule.id)).map((rule) => rule.id);
    if (missing.length > 0) {
      throw new ApiError('CULTURAL_RESTRICTION', 'Please acknowledge the community guidance for this item.', { itemId: request.itemId, ruleIds: missing });
    }
  };
  switch (request.itemType) {
    case 'experience': {
      const experience = inventory.experiences.find((e) => e.id === request.itemId);
      if (!experience || !request.time || !experience.slots.includes(request.time)) throw unavailable();
      blocked({ kind: 'experience', item: experience });
      return experienceLine(experience, request.date, request.time, request.participants);
    }
    case 'event_ticket': {
      const event = inventory.events.find((e) => e.id === request.itemId);
      if (!event || !event.ticketTypes.some((t) => t.id === request.variantId)) throw unavailable();
      blocked({ kind: 'event', item: event });
      return eventLine(event, request.variantId!, request.date, request.participants);
    }
    case 'guide': {
      const guide = inventory.guides.find((g) => g.id === request.itemId);
      if (!guide?.verified) throw unavailable();
      return guideLine(guide, request.date, request.participants);
    }
    case 'driver': {
      const driver = inventory.drivers.find((d) => d.id === request.itemId);
      if (!driver?.verified || driver.vehicle.seats < request.participants) throw unavailable();
      return driverLine(driver, request.date, request.participants);
    }
  }
}

function inventoryKey(line: Omit<CartLine, 'id'>): string {
  return line.itemType === 'event_ticket' ? `${line.itemId}:${line.variantId}` : line.itemId;
}

function isAvailable(line: Omit<CartLine, 'id'>, inventory: Inventory, booked: BookedLookup): boolean {
  switch (line.itemType) {
    case 'experience':
      return experienceAvailability(inventory.experiences.find((e) => e.id === line.itemId)!, line.date, line.time, line.participants, booked).available;
    case 'event_ticket':
      return eventAvailability(inventory.events.find((e) => e.id === line.itemId)!, line.date, line.variantId!, line.participants, booked).available;
    case 'guide':
      return serviceAvailability(inventory.guides.find((g) => g.id === line.itemId)!, line.date, booked).available;
    case 'driver':
      return serviceAvailability(inventory.drivers.find((d) => d.id === line.itemId)!, line.date, booked).available;
  }
}

// ---------------------------------------------------------------------------
// Ledger persistence: the domain functions work on a Ledger; these load one
// order's slice from the database and write back what changed.

function money(amount: number) {
  return { amount: Number(amount), currency: 'IDR' as const };
}

async function loadSlice(tx: Tx, orderId: string): Promise<Ledger> {
  const [orders, bookings, payments, settlements, refunds] = await Promise.all([
    tx.query('SELECT * FROM orders WHERE id = $1', [orderId]),
    tx.query('SELECT * FROM bookings WHERE order_id = $1 ORDER BY created_at, id FOR UPDATE', [orderId]),
    tx.query('SELECT * FROM payments WHERE order_id = $1 FOR UPDATE', [orderId]),
    tx.query('SELECT * FROM settlements WHERE order_id = $1 FOR UPDATE', [orderId]),
    tx.query('SELECT * FROM refunds WHERE order_id = $1', [orderId]),
  ]);
  const bookingRows = bookings.rows.map(rowToBooking);
  return {
    orders: orders.rows.map((r) => rowToOrder(r, bookingRows.filter((b) => b.orderId === r.id).map((b) => b.id), payments.rows[0]?.id)),
    bookings: bookingRows,
    payments: payments.rows.map((r) => rowToPayment(r, [])),
    settlements: settlements.rows.map(rowToSettlement),
    refunds: refunds.rows.map(rowToRefund),
    processedEvents: [],
  };
}

async function persistSlice(tx: Tx, before: Ledger, after: Ledger, actor: Actor, source: string): Promise<void> {
  for (const booking of after.bookings) {
    const old = before.bookings.find((b) => b.id === booking.id);
    if (old && old.status !== booking.status) {
      await tx.query('UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1', [booking.id, booking.status]);
      await audit(tx, actor, { source, action: `booking.${booking.status}`, entity: 'booking', entityId: booking.id, before: { status: old.status }, after: { status: booking.status } });
    }
  }
  for (const payment of after.payments) {
    const old = before.payments.find((p) => p.id === payment.id)!;
    if (old.status !== payment.status || old.refunded.amount !== payment.refunded.amount) {
      await tx.query('UPDATE payments SET status = $2, refunded = $3, updated_at = now() WHERE id = $1', [payment.id, payment.status, payment.refunded.amount]);
    }
    for (const entry of payment.audit.slice(old.audit.length)) {
      await audit(tx, { id: actor.id, role: entry.actor }, { source, action: entry.action, entity: 'payment', entityId: payment.id, before: { status: entry.from }, after: { status: entry.to } });
    }
  }
  for (const settlement of after.settlements) {
    const old = before.settlements.find((s) => s.id === settlement.id);
    if (old && old.status !== settlement.status) {
      await tx.query('UPDATE settlements SET status = $2, updated_at = now() WHERE id = $1', [settlement.id, settlement.status]);
      await audit(tx, actor, { source, action: `settlement.${settlement.status}`, entity: 'settlement', entityId: settlement.id, before: { status: old.status }, after: { status: settlement.status } });
    }
  }
  for (const refund of after.refunds.filter((r) => !before.refunds.some((b) => b.id === r.id))) {
    await tx.query(
      'INSERT INTO refunds (id, order_id, booking_id, amount, currency, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [refund.id, refund.orderId, refund.bookingId, refund.amount.amount, refund.amount.currency, refund.status, refund.createdAt],
    );
    await audit(tx, actor, { source, action: 'refund.processed', entity: 'refund', entityId: refund.id, after: refund });
  }
}

// ---------------------------------------------------------------------------
// Use cases

/**
 * Creates a platform order with child supplier bookings (spec §13). Prices and
 * cultural rules come from the database; each inventory slot is locked while
 * availability is re-checked, so concurrent checkouts cannot overbook.
 */
export async function createOrder(db: Db, provider: PaymentProvider, user: AuthUser, request: CheckoutRequest): Promise<{ orderId: string }> {
  const existing = await db.query('SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2', [user.id, request.idempotencyKey]);
  if (existing.rows[0]) return { orderId: existing.rows[0].id };

  const inventory = await loadInventory(db);
  const acknowledged = new Set(request.acknowledgedRuleIds);
  const priced = request.lines.map((line) => priceLine(line, inventory, acknowledged));
  const actor: Actor = { id: user.id, role: user.role };

  let created: { order: Order; payment: Payment };
  try {
    created = await transaction(db, async (tx) => {
      // Lock every slot this order touches, in a fixed order to avoid deadlocks.
      const keys = [...new Set(priced.map((line) => `${inventoryKey(line)}|${line.date}`))].sort();
      for (const key of keys) await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);

      const dates = priced.map((line) => line.date).sort();
      const held = lookupFromRows(await bookedRows(tx, dates[0], dates[dates.length - 1]));
      // Lines earlier in this same order also hold seats.
      const taken: Omit<CartLine, 'id'>[] = [];
      const booked: BookedLookup = (itemId, d, t) =>
        held(itemId, d, t) +
        taken
          .filter((line) => inventoryKey(line) === itemId && line.date === d && (t === undefined || line.itemType !== 'experience' || line.time === t))
          .reduce((sum, line) => sum + (line.itemType === 'guide' || line.itemType === 'driver' ? 1 : line.participants), 0);
      for (const line of priced) {
        if (!isAvailable(line, inventory, booked)) {
          throw new ApiError('BOOKING_UNAVAILABLE', `${line.title} is no longer available for ${line.date}.`, { itemId: line.itemId, date: line.date });
        }
        taken.push(line);
      }

      const now = new Date();
      const cart: Cart = {
        id: newId('CART'),
        status: 'active',
        lines: priced.map((line) => ({ ...line, id: newId('LINE') })),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      };
      const { ledger, order } = createOrderInLedger(
        EMPTY_LEDGER,
        { cart, traveller: request.traveller, method: request.method, provider: provider.id, idempotencyKey: request.idempotencyKey },
        now,
        (prefix) => newId(prefix),
      );
      const payment = ledger.payments[0];

      await tx.query(
        `INSERT INTO orders (id, user_id, cart_id, idempotency_key, traveller_name, traveller_email, total, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [order.id, user.id, order.cartId, order.idempotencyKey, order.travellerName, order.travellerEmail, order.total.amount, order.total.currency],
      );
      for (const b of ledger.bookings) {
        await tx.query(
          `INSERT INTO bookings (id, order_id, line_id, supplier_id, item_type, item_id, variant_id, title, service_date, service_time,
                                 participants, amount, currency, status, free_cancellation_hours, pass_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [b.id, b.orderId, b.lineId, b.supplierId, b.itemType, b.itemId, b.variantId ?? null, b.title, b.date, b.time,
            b.participants, b.amount.amount, b.amount.currency, b.status, b.cancellationPolicy.freeCancellationHours, b.passCode],
        );
      }
      await tx.query(
        `INSERT INTO payments (id, order_id, provider, method, currency, gross, platform_fee, processing_fee, status, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [payment.id, order.id, payment.provider, payment.method, payment.currency, payment.gross.amount, payment.platformFee.amount,
          payment.processingFee.amount, payment.status, payment.idempotencyKey],
      );
      for (const s of ledger.settlements) {
        await tx.query(
          'INSERT INTO settlements (id, order_id, booking_id, supplier_id, payable, currency, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [s.id, s.orderId, s.bookingId, s.supplierId, s.payable.amount, s.payable.currency, s.status],
        );
      }
      await audit(tx, actor, { source: 'api', action: 'order.created', entity: 'order', entityId: order.id, after: { total: order.total, bookings: order.bookingIds } });
      await audit(tx, actor, { source: 'api', action: 'payment.created', entity: 'payment', entityId: payment.id, after: { status: 'pending' } });
      return { order, payment };
    });
  } catch (error) {
    // A concurrent request with the same key won the race: return its order.
    if ((error as { code?: string }).code === '23505') {
      const raced = await db.query('SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2', [user.id, request.idempotencyKey]);
      if (raced.rows[0]) return { orderId: raced.rows[0].id };
    }
    throw error;
  }

  const { intentId } = await provider.createIntent({
    paymentId: created.payment.id,
    amount: created.payment.gross,
    method: request.method,
    idempotencyKey: request.idempotencyKey,
    simulateFailure: provider.isDemo ? request.simulateFailure : undefined,
  });
  await db.query('UPDATE payments SET intent_id = $2, updated_at = now() WHERE id = $1', [created.payment.id, intentId]);
  return { orderId: created.order.id };
}

/**
 * Applies a verified provider callback. The event ID is stored first; a replay
 * finds it and changes nothing (spec §26: payment callbacks safely replayable).
 */
export async function applyWebhook(db: Db, event: PaymentEvent): Promise<'applied' | 'duplicate' | 'ignored'> {
  return transaction(db, async (tx) => {
    const payment = (await tx.query('SELECT order_id, intent_id FROM payments WHERE id = $1 FOR UPDATE', [event.paymentId])).rows[0];
    if (!payment || payment.intent_id !== event.intentId) return 'ignored';
    const inserted = await tx.query(
      'INSERT INTO payment_events (id, payment_id, type, payload) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING RETURNING id',
      [event.id, event.paymentId, event.type, JSON.stringify(event)],
    );
    if (inserted.rowCount === 0) return 'duplicate';
    const before = await loadSlice(tx, payment.order_id);
    let after: Ledger;
    try {
      after = applyPaymentEvent(before, event);
    } catch (error) {
      // An out-of-order event (e.g. failure after success) is recorded but not applied.
      if (error instanceof InvalidTransitionError) return 'ignored';
      throw error;
    }
    await persistSlice(tx, before, after, { id: null, role: 'psp' }, 'psp-webhook');
    return 'applied';
  });
}

/**
 * Cancels one booking (partial cancellation, spec §13); the refund follows that
 * line's own policy and the supplier's settlement is reversed when refunded.
 */
export async function cancelBooking(db: Db, provider: PaymentProvider, user: AuthUser, bookingId: string) {
  return transaction(db, async (tx) => {
    const row = (await tx.query(
      `SELECT b.order_id, o.user_id, p.intent_id FROM bookings b JOIN orders o ON o.id = b.order_id JOIN payments p ON p.order_id = o.id WHERE b.id = $1`,
      [bookingId],
    )).rows[0];
    if (!row || (row.user_id !== user.id && user.role !== 'admin')) throw new ApiError('NOT_FOUND', 'Booking not found.');
    const before = await loadSlice(tx, row.order_id);
    let result;
    try {
      result = cancelInLedger(before, bookingId, new Date(), (prefix) => newId(prefix));
    } catch (error) {
      if (error instanceof InvalidTransitionError) throw new ApiError('INVALID_TRANSITION', 'This booking can no longer be cancelled.');
      throw error;
    }
    if (result.refund && row.intent_id) {
      const outcome = await provider.refund({ intentId: row.intent_id, amount: result.refund.amount, refundId: result.refund.id });
      if (outcome.status === 'failed') throw new ApiError('INTERNAL_ERROR', 'The refund could not be processed. Nothing was cancelled.');
    }
    await persistSlice(tx, before, result.ledger, { id: user.id, role: user.role }, 'api');
    return { refund: result.refund };
  });
}

/** Vendor marks a confirmed booking completed or no-show; its settlement becomes eligible. */
export async function closeBooking(db: Db, user: AuthUser, bookingId: string, outcome: 'completed' | 'no_show') {
  return transaction(db, async (tx) => {
    const booking = (await tx.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId])).rows[0];
    if (!booking || (user.role === 'vendor' && booking.supplier_id !== user.vendorId)) throw new ApiError('NOT_FOUND', 'Booking not found.');
    try {
      assertTransition(BOOKING_TRANSITIONS, 'Booking', booking.status, outcome);
    } catch {
      throw new ApiError('INVALID_TRANSITION', `A ${booking.status} booking cannot be marked ${outcome}.`);
    }
    await tx.query('UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1', [bookingId, outcome]);
    const settlement = (await tx.query('SELECT * FROM settlements WHERE booking_id = $1 FOR UPDATE', [bookingId])).rows[0];
    if (settlement && settlement.status === 'pending') {
      await tx.query(`UPDATE settlements SET status = 'eligible', updated_at = now() WHERE id = $1`, [settlement.id]);
    }
    await audit(tx, { id: user.id, role: user.role }, { source: 'vendor-portal', action: `booking.${outcome}`, entity: 'booking', entityId: bookingId, before: { status: booking.status }, after: { status: outcome } });
  });
}

/** Admin records a payout for an eligible settlement. */
export async function paySettlement(db: Db, user: AuthUser, settlementId: string) {
  return transaction(db, async (tx) => {
    const settlement = (await tx.query('SELECT * FROM settlements WHERE id = $1 FOR UPDATE', [settlementId])).rows[0];
    if (!settlement) throw new ApiError('NOT_FOUND', 'Settlement not found.');
    try {
      assertTransition(SETTLEMENT_TRANSITIONS, 'Settlement', settlement.status, 'paid');
    } catch {
      throw new ApiError('INVALID_TRANSITION', `A ${settlement.status} settlement cannot be paid.`);
    }
    await tx.query(`UPDATE settlements SET status = 'paid', updated_at = now() WHERE id = $1`, [settlementId]);
    await audit(tx, { id: user.id, role: user.role }, { source: 'admin-portal', action: 'settlement.paid', entity: 'settlement', entityId: settlementId, before: { status: settlement.status }, after: { status: 'paid' } });
  });
}

// ---------------------------------------------------------------------------
// Read models

export function rowToBooking(r: Record<string, any>): Booking {
  return {
    id: r.id,
    orderId: r.order_id,
    lineId: r.line_id,
    supplierId: r.supplier_id,
    itemType: r.item_type,
    itemId: r.item_id,
    variantId: r.variant_id ?? undefined,
    title: r.title,
    date: r.service_date,
    time: r.service_time,
    participants: r.participants,
    amount: money(r.amount),
    status: r.status,
    cancellationPolicy: { freeCancellationHours: r.free_cancellation_hours },
    passCode: r.pass_code,
  };
}

function rowToOrder(r: Record<string, any>, bookingIds: string[], paymentId: string): Order {
  return {
    id: r.id,
    cartId: r.cart_id,
    idempotencyKey: r.idempotency_key,
    createdAt: new Date(r.created_at).toISOString(),
    travellerName: r.traveller_name,
    travellerEmail: r.traveller_email,
    bookingIds,
    paymentId,
    total: money(r.total),
  };
}

function rowToPayment(r: Record<string, any>, auditTrail: AuditEvent[]): Payment {
  return {
    id: r.id,
    orderId: r.order_id,
    provider: r.provider,
    method: r.method,
    currency: 'IDR',
    gross: money(r.gross),
    platformFee: money(r.platform_fee),
    processingFee: money(r.processing_fee),
    refunded: money(r.refunded),
    status: r.status,
    idempotencyKey: r.idempotency_key,
    intentId: r.intent_id,
    audit: auditTrail,
  };
}

export function rowToSettlement(r: Record<string, any>): Settlement {
  return { id: r.id, orderId: r.order_id, bookingId: r.booking_id, supplierId: r.supplier_id, payable: money(r.payable), status: r.status };
}

function rowToRefund(r: Record<string, any>): Refund {
  return { id: r.id, orderId: r.order_id, bookingId: r.booking_id, amount: money(r.amount), status: r.status, createdAt: new Date(r.created_at).toISOString() };
}

/**
 * A traveller's orders, bookings, payments and refunds in domain shapes.
 * Settlements are supplier-facing and are not included.
 */
export async function travellerLedger(db: Db, userId: string): Promise<Ledger> {
  const orders = (await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at', [userId])).rows;
  const ids = orders.map((o) => o.id);
  if (ids.length === 0) return EMPTY_LEDGER;
  const [bookings, payments, refunds, trail] = await Promise.all([
    db.query('SELECT * FROM bookings WHERE order_id = ANY($1) ORDER BY created_at, id', [ids]),
    db.query('SELECT * FROM payments WHERE order_id = ANY($1)', [ids]),
    db.query('SELECT * FROM refunds WHERE order_id = ANY($1) ORDER BY created_at', [ids]),
    db.query(`SELECT * FROM audit_log WHERE entity = 'payment' AND entity_id IN (SELECT id FROM payments WHERE order_id = ANY($1)) ORDER BY id`, [ids]),
  ]);
  const bookingRows = bookings.rows.map(rowToBooking);
  const actorOf = (role: string): AuditEvent['actor'] => (role === 'psp' ? 'psp' : role === 'traveller' ? 'traveller' : 'system');
  return {
    orders: orders.map((o) => rowToOrder(o, bookingRows.filter((b) => b.orderId === o.id).map((b) => b.id), payments.rows.find((p) => p.order_id === o.id)?.id)),
    bookings: bookingRows,
    payments: payments.rows.map((p) =>
      rowToPayment(
        p,
        trail.rows
          .filter((a) => a.entity_id === p.id)
          .map((a) => ({ at: new Date(a.at).toISOString(), actor: actorOf(a.actor_role), action: a.action, from: a.before?.status, to: a.after?.status })),
      ),
    ),
    settlements: [],
    refunds: refunds.rows.map(rowToRefund),
    processedEvents: [],
  };
}

export { SYSTEM };
