import type { BookedLookup } from './availability';
import { hoursUntil } from './time';
import type {
  AuditEvent,
  Booking,
  BookingStatus,
  Cart,
  CartLine,
  CartStatus,
  Money,
  Order,
  Payment,
  PaymentStatus,
  Refund,
  Settlement,
  SettlementStatus,
} from './types';

// ---------------------------------------------------------------------------
// State machines (spec §14)

export const CART_TRANSITIONS: Record<CartStatus, CartStatus[]> = {
  active: ['converted', 'expired'],
  expired: [],
  converted: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['authorized', 'paid', 'failed'],
  authorized: ['paid', 'failed'],
  paid: ['partially_refunded', 'refunded'],
  partially_refunded: ['partially_refunded', 'refunded'],
  failed: [],
  refunded: [],
};

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'completed', 'no_show'],
  cancelled: [],
  completed: [],
  no_show: [],
};

export const SETTLEMENT_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  pending: ['eligible', 'held', 'reversed'],
  eligible: ['paid', 'held', 'reversed'],
  held: ['eligible', 'reversed'],
  paid: ['reversed'],
  reversed: [],
};

export class InvalidTransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`${entity} cannot move from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition<S extends string>(
  table: Record<S, S[]>,
  entity: string,
  from: S,
  to: S,
): void {
  if (!table[from].includes(to)) throw new InvalidTransitionError(entity, from, to);
}

// ---------------------------------------------------------------------------
// Fees

/**
 * DEMO fee rates. Real rates are business policy still to be decided (D-008 in
 * docs/decisions.md); these exist only so the ledger can show every component
 * the spec requires: gross, platform fee, processing fee and vendor payable.
 */
export const DEMO_FEES = { platformFeeRate: 0.1, processingFeeRate: 0.029 } as const;

const idr = (amount: number): Money => ({ amount: Math.round(amount), currency: 'IDR' });

export function lineTotal(line: Pick<CartLine, 'unitPrice' | 'participants' | 'pricing'>): Money {
  return idr(line.unitPrice.amount * (line.pricing === 'person' ? line.participants : 1));
}

export function cartTotal(cart: Cart): Money {
  return idr(cart.lines.reduce((sum, line) => sum + lineTotal(line).amount, 0));
}

// ---------------------------------------------------------------------------
// Cart

export const CART_LIFETIME_MINUTES = 60;

type IdFactory = (prefix: string) => string;

let sequence = 0;
export const defaultId: IdFactory = (prefix) => {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${sequence}${random}`;
};

export function newCart(now: Date = new Date(), id: IdFactory = defaultId): Cart {
  return {
    id: id('CART'),
    status: 'active',
    lines: [],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CART_LIFETIME_MINUTES * 60_000).toISOString(),
  };
}

export function isCartExpired(cart: Cart, now: Date = new Date()): boolean {
  return cart.status === 'expired' || (cart.status === 'active' && new Date(cart.expiresAt) <= now);
}

/** Any change to the cart extends its life, as a traveller is still shopping. */
function touched(cart: Cart, now: Date): Cart {
  return { ...cart, expiresAt: new Date(now.getTime() + CART_LIFETIME_MINUTES * 60_000).toISOString() };
}

export function addLine(cart: Cart, line: Omit<CartLine, 'id'>, now: Date = new Date(), id: IdFactory = defaultId): Cart {
  if (cart.status !== 'active') throw new InvalidTransitionError('Cart', cart.status, 'active');
  return touched({ ...cart, lines: [...cart.lines, { ...line, id: id('LINE') }] }, now);
}

export function removeLine(cart: Cart, lineId: string, now: Date = new Date()): Cart {
  return touched({ ...cart, lines: cart.lines.filter((line) => line.id !== lineId) }, now);
}

export function updateParticipants(cart: Cart, lineId: string, participants: number, now: Date = new Date()): Cart {
  const value = Math.max(1, Math.min(20, Math.round(participants)));
  return touched(
    { ...cart, lines: cart.lines.map((line) => (line.id === lineId ? { ...line, participants: value } : line)) },
    now,
  );
}

// ---------------------------------------------------------------------------
// Ledger: orders, child bookings, payments, settlements, refunds

export type Ledger = {
  orders: Order[];
  bookings: Booking[];
  payments: Payment[];
  settlements: Settlement[];
  refunds: Refund[];
  /** PSP event IDs already applied, so callbacks are safely replayable (spec §26). */
  processedEvents: string[];
};

export const EMPTY_LEDGER: Ledger = {
  orders: [],
  bookings: [],
  payments: [],
  settlements: [],
  refunds: [],
  processedEvents: [],
};

function audit(actor: AuditEvent['actor'], action: string, now: Date, from?: string, to?: string): AuditEvent {
  return { at: now.toISOString(), actor, action, from, to };
}

function passCode(id: IdFactory): string {
  return id('PASS').split('-')[1].slice(-8);
}

export type CheckoutInput = {
  cart: Cart;
  traveller: { name: string; email: string };
  method: string;
  provider: string;
  /** One key per checkout attempt; repeating it returns the same order (spec §26). */
  idempotencyKey: string;
};

export class CheckoutError extends Error {
  constructor(public readonly code: 'cart_empty' | 'cart_expired' | 'cart_converted' | 'unavailable') {
    super(code);
    this.name = 'CheckoutError';
  }
}

/**
 * Creates a platform order with one child booking per cart line, a pending
 * payment and a pending settlement per supplier booking (spec §13). Idempotent:
 * the same key returns the existing order without creating anything new.
 */
export function createOrder(
  ledger: Ledger,
  input: CheckoutInput,
  now: Date = new Date(),
  id: IdFactory = defaultId,
): { ledger: Ledger; order: Order; cart: Cart } {
  const existing = ledger.orders.find((order) => order.idempotencyKey === input.idempotencyKey);
  if (existing) return { ledger, order: existing, cart: { ...input.cart, status: 'converted' } };

  const { cart } = input;
  if (cart.status === 'converted') throw new CheckoutError('cart_converted');
  if (isCartExpired(cart, now)) throw new CheckoutError('cart_expired');
  if (cart.lines.length === 0) throw new CheckoutError('cart_empty');

  const orderId = id('ORD');
  const paymentId = id('PAY');
  const gross = cartTotal(cart);
  const platformFee = idr(gross.amount * DEMO_FEES.platformFeeRate);
  const processingFee = idr(gross.amount * DEMO_FEES.processingFeeRate);

  const bookings: Booking[] = cart.lines.map((line) => ({
    id: id('BKG'),
    orderId,
    lineId: line.id,
    supplierId: line.supplierId,
    itemType: line.itemType,
    itemId: line.itemId,
    variantId: line.variantId,
    title: line.title,
    date: line.date,
    time: line.time,
    participants: line.participants,
    amount: lineTotal(line),
    status: 'pending',
    cancellationPolicy: line.cancellationPolicy,
    passCode: passCode(id),
  }));

  const settlements: Settlement[] = bookings.map((booking) => ({
    id: id('STL'),
    orderId,
    bookingId: booking.id,
    supplierId: booking.supplierId,
    payable: idr(booking.amount.amount * (1 - DEMO_FEES.platformFeeRate - DEMO_FEES.processingFeeRate)),
    status: 'pending',
  }));

  const payment: Payment = {
    id: paymentId,
    orderId,
    provider: input.provider,
    method: input.method,
    currency: 'IDR',
    gross,
    platformFee,
    processingFee,
    refunded: idr(0),
    status: 'pending',
    idempotencyKey: input.idempotencyKey,
    intentId: null,
    audit: [audit('traveller', 'payment.created', now, undefined, 'pending')],
  };

  const order: Order = {
    id: orderId,
    cartId: cart.id,
    idempotencyKey: input.idempotencyKey,
    createdAt: now.toISOString(),
    travellerName: input.traveller.name,
    travellerEmail: input.traveller.email,
    bookingIds: bookings.map((booking) => booking.id),
    paymentId,
    total: gross,
  };

  assertTransition(CART_TRANSITIONS, 'Cart', cart.status, 'converted');
  return {
    order,
    cart: { ...cart, status: 'converted' },
    ledger: {
      ...ledger,
      orders: [...ledger.orders, order],
      bookings: [...ledger.bookings, ...bookings],
      payments: [...ledger.payments, payment],
      settlements: [...ledger.settlements, ...settlements],
    },
  };
}

export function attachIntent(ledger: Ledger, paymentId: string, intentId: string): Ledger {
  return {
    ...ledger,
    payments: ledger.payments.map((payment) => (payment.id === paymentId ? { ...payment, intentId } : payment)),
  };
}

/** Events a payment provider sends back to the platform (via its adapter). */
export type PaymentEvent = {
  /** Provider event ID, unique per event; used for replay protection. */
  id: string;
  type: 'payment.authorized' | 'payment.succeeded' | 'payment.failed';
  paymentId: string;
  intentId: string;
};

function movePayment(payment: Payment, to: PaymentStatus, action: string, now: Date, actor: AuditEvent['actor'] = 'psp'): Payment {
  if (payment.status === to && to !== 'partially_refunded') return payment;
  assertTransition(PAYMENT_TRANSITIONS, 'Payment', payment.status, to);
  return { ...payment, status: to, audit: [...payment.audit, audit(actor, action, now, payment.status, to)] };
}

function moveBooking(booking: Booking, to: BookingStatus): Booking {
  if (booking.status === to) return booking;
  assertTransition(BOOKING_TRANSITIONS, 'Booking', booking.status, to);
  return { ...booking, status: to };
}

function moveSettlement(settlement: Settlement, to: SettlementStatus): Settlement {
  if (settlement.status === to) return settlement;
  assertTransition(SETTLEMENT_TRANSITIONS, 'Settlement', settlement.status, to);
  return { ...settlement, status: to };
}

/**
 * Applies a provider callback. Replaying an event that was already processed
 * changes nothing, so duplicate deliveries cannot double-confirm (spec §26).
 */
export function applyPaymentEvent(ledger: Ledger, event: PaymentEvent, now: Date = new Date()): Ledger {
  if (ledger.processedEvents.includes(event.id)) return ledger;
  const payment = ledger.payments.find((p) => p.id === event.paymentId);
  if (!payment || payment.intentId !== event.intentId) return ledger;

  let nextPayment = payment;
  let bookingStatus: BookingStatus | null = null;
  if (event.type === 'payment.authorized') {
    nextPayment = movePayment(payment, 'authorized', event.type, now);
  } else if (event.type === 'payment.succeeded') {
    nextPayment = movePayment(payment, 'paid', event.type, now);
    bookingStatus = 'confirmed';
  } else {
    nextPayment = movePayment(payment, 'failed', event.type, now);
    bookingStatus = 'cancelled';
  }

  const order = ledger.orders.find((o) => o.id === payment.orderId);
  const bookingIds = new Set(order?.bookingIds ?? []);
  return {
    ...ledger,
    processedEvents: [...ledger.processedEvents, event.id],
    payments: ledger.payments.map((p) => (p.id === payment.id ? nextPayment : p)),
    bookings: ledger.bookings.map((booking) =>
      bookingStatus && bookingIds.has(booking.id) ? moveBooking(booking, bookingStatus) : booking,
    ),
    settlements: ledger.settlements.map((settlement) =>
      event.type === 'payment.failed' && bookingIds.has(settlement.bookingId)
        ? moveSettlement(settlement, 'reversed')
        : settlement,
    ),
  };
}

export type CancellationQuote = { refundable: boolean; refund: Money; hoursBefore: number };

/** Refund due if a booking is cancelled now, under its own line-item policy. */
export function cancellationQuote(booking: Booking, now: Date = new Date()): CancellationQuote {
  const hoursBefore = hoursUntil(booking.date, booking.time, now);
  const refundable = hoursBefore >= booking.cancellationPolicy.freeCancellationHours;
  return { refundable, refund: refundable ? booking.amount : idr(0), hoursBefore };
}

/**
 * Cancels one line of an order (partial cancellation, spec §13). The refund
 * follows that line's policy; the supplier's settlement is reversed when refunded.
 */
export function cancelBooking(
  ledger: Ledger,
  bookingId: string,
  now: Date = new Date(),
  id: IdFactory = defaultId,
): { ledger: Ledger; refund: Refund | null } {
  const booking = ledger.bookings.find((b) => b.id === bookingId);
  if (!booking) return { ledger, refund: null };
  const cancelled = moveBooking(booking, 'cancelled');
  const payment = ledger.payments.find((p) => p.orderId === booking.orderId);
  const quote = cancellationQuote(booking, now);

  let refund: Refund | null = null;
  let nextPayment = payment;
  if (payment && payment.status !== 'pending' && quote.refund.amount > 0) {
    const refunded = idr(payment.refunded.amount + quote.refund.amount);
    const full = refunded.amount >= payment.gross.amount;
    nextPayment = {
      ...movePayment(payment, full ? 'refunded' : 'partially_refunded', 'refund.processed', now, 'system'),
      refunded,
    };
    refund = {
      id: id('RFD'),
      orderId: booking.orderId,
      bookingId,
      amount: quote.refund,
      status: 'processed',
      createdAt: now.toISOString(),
    };
  }

  return {
    refund,
    ledger: {
      ...ledger,
      bookings: ledger.bookings.map((b) => (b.id === bookingId ? cancelled : b)),
      payments: ledger.payments.map((p) => (nextPayment && p.id === nextPayment.id ? nextPayment : p)),
      settlements: ledger.settlements.map((settlement) =>
        settlement.bookingId === bookingId && refund ? moveSettlement(settlement, 'reversed') : settlement,
      ),
      refunds: refund ? [...ledger.refunds, refund] : ledger.refunds,
    },
  };
}

/** Seats and services held by live bookings, for availability checks. */
export function bookedFromLedger(ledger: Ledger): BookedLookup {
  const live = ledger.bookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed');
  return (itemId, date, time) =>
    live
      .filter((booking) => {
        const key = booking.itemType === 'event_ticket' ? `${booking.itemId}:${booking.variantId}` : booking.itemId;
        if (key !== itemId || booking.date !== date) return false;
        return time === undefined || booking.itemType !== 'experience' || booking.time === time;
      })
      .reduce((sum, booking) => sum + (booking.itemType === 'guide' || booking.itemType === 'driver' ? 1 : booking.participants), 0);
}
