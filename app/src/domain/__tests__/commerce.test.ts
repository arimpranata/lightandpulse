import { describe, expect, it } from '@jest/globals';

import {
  addLine,
  applyPaymentEvent,
  assertTransition,
  attachIntent,
  bookedFromLedger,
  cancelBooking,
  cartTotal,
  CheckoutError,
  createOrder,
  DEMO_FEES,
  EMPTY_LEDGER,
  InvalidTransitionError,
  newCart,
  PAYMENT_TRANSITIONS,
  type PaymentEvent,
} from '@/domain/commerce';
import type { Cart, CartLine } from '@/domain/types';

const NOW = new Date('2027-02-01T00:00:00Z');

let n = 0;
const ids = (prefix: string) => `${prefix}-${++n}`;

function line(overrides: Partial<Omit<CartLine, 'id'>> = {}): Omit<CartLine, 'id'> {
  return {
    itemType: 'experience',
    itemId: 'exp-batik-ubud',
    supplierId: 'ven-ubud-arts',
    title: 'Batik class',
    date: '2027-03-02',
    time: '09:00',
    participants: 2,
    unitPrice: { amount: 350_000, currency: 'IDR' },
    pricing: 'person',
    cancellationPolicy: { freeCancellationHours: 24 },
    ...overrides,
  };
}

function multiVendorCart(): Cart {
  let cart = newCart(NOW, ids);
  cart = addLine(cart, line(), NOW, ids);
  cart = addLine(
    cart,
    line({ itemType: 'event_ticket', itemId: 'evt-kecak-uluwatu', variantId: 'regular', supplierId: 'ven-uluwatu-arts', title: 'Kecak', time: '18:00', unitPrice: { amount: 150_000, currency: 'IDR' } }),
    NOW,
    ids,
  );
  cart = addLine(
    cart,
    line({ itemType: 'driver', itemId: 'dr-avanza', supplierId: 'ven-transport', title: 'Driver', time: '08:00', pricing: 'service', participants: 2, unitPrice: { amount: 650_000, currency: 'IDR' } }),
    NOW,
    ids,
  );
  return cart;
}

function checkout(cart = multiVendorCart(), key = 'key-1') {
  return createOrder(EMPTY_LEDGER, { cart, traveller: { name: 'Ayu', email: 'ayu@example.com' }, method: 'qris', provider: 'demo-psp', idempotencyKey: key }, NOW, ids);
}

function pay(ledger = checkout().ledger, type: PaymentEvent['type'] = 'payment.succeeded') {
  const payment = ledger.payments[0];
  const withIntent = attachIntent(ledger, payment.id, 'pi_1');
  const event: PaymentEvent = { id: `evt-${type}`, type, paymentId: payment.id, intentId: 'pi_1' };
  return { ledger: applyPaymentEvent(withIntent, event, NOW), event };
}

describe('one-cart multi-vendor checkout', () => {
  it('creates a parent order with one child booking per line and supplier', () => {
    const { ledger, order, cart } = checkout();
    expect(cart.status).toBe('converted');
    expect(order.bookingIds).toHaveLength(3);
    expect(new Set(ledger.bookings.map((b) => b.supplierId))).toEqual(new Set(['ven-ubud-arts', 'ven-uluwatu-arts', 'ven-transport']));
    expect(ledger.bookings.every((b) => b.status === 'pending')).toBe(true);
    expect(ledger.settlements).toHaveLength(3);
  });

  it('prices per-person and per-service lines correctly', () => {
    expect(cartTotal(multiVendorCart()).amount).toBe(350_000 * 2 + 150_000 * 2 + 650_000);
  });

  it('records gross, platform fee, processing fee and vendor payables', () => {
    const { ledger } = checkout();
    const payment = ledger.payments[0];
    expect(payment.platformFee.amount).toBe(Math.round(payment.gross.amount * DEMO_FEES.platformFeeRate));
    expect(payment.processingFee.amount).toBe(Math.round(payment.gross.amount * DEMO_FEES.processingFeeRate));
    const payables = ledger.settlements.reduce((sum, s) => sum + s.payable.amount, 0);
    expect(payables + payment.platformFee.amount + payment.processingFee.amount).toBeCloseTo(payment.gross.amount, -1);
  });

  it('is idempotent: the same key never creates a second order', () => {
    const cart = multiVendorCart();
    const first = createOrder(EMPTY_LEDGER, { cart, traveller: { name: 'Ayu', email: 'a@b.co' }, method: 'qris', provider: 'demo-psp', idempotencyKey: 'same' }, NOW, ids);
    const second = createOrder(first.ledger, { cart, traveller: { name: 'Ayu', email: 'a@b.co' }, method: 'qris', provider: 'demo-psp', idempotencyKey: 'same' }, NOW, ids);
    expect(second.order.id).toBe(first.order.id);
    expect(second.ledger.orders).toHaveLength(1);
    expect(second.ledger.bookings).toHaveLength(3);
  });

  it('rejects empty, expired and converted carts', () => {
    expect(() => checkout(newCart(NOW, ids))).toThrow(CheckoutError);
    const expired = { ...multiVendorCart(), expiresAt: '2027-01-31T00:00:00Z' };
    expect(() => checkout(expired, 'k2')).toThrow('cart_expired');
    expect(() => checkout({ ...multiVendorCart(), status: 'converted' }, 'k3')).toThrow('cart_converted');
  });
});

describe('payment state machine', () => {
  it('confirms every child booking when payment succeeds', () => {
    const { ledger } = pay();
    expect(ledger.payments[0].status).toBe('paid');
    expect(ledger.bookings.every((b) => b.status === 'confirmed')).toBe(true);
    expect(ledger.payments[0].audit.map((a) => a.to)).toEqual(['pending', 'paid']);
  });

  it('is safely replayable: a duplicate callback changes nothing', () => {
    const { ledger, event } = pay();
    expect(applyPaymentEvent(ledger, event, NOW)).toBe(ledger);
  });

  it('ignores callbacks for an unknown intent', () => {
    const { ledger } = checkout();
    const payment = ledger.payments[0];
    const result = applyPaymentEvent(attachIntent(ledger, payment.id, 'pi_real'), { id: 'x', type: 'payment.succeeded', paymentId: payment.id, intentId: 'pi_other' }, NOW);
    expect(result.payments[0].status).toBe('pending');
  });

  it('cancels bookings and reverses settlements when payment fails', () => {
    const { ledger } = pay(checkout().ledger, 'payment.failed');
    expect(ledger.payments[0].status).toBe('failed');
    expect(ledger.bookings.every((b) => b.status === 'cancelled')).toBe(true);
    expect(ledger.settlements.every((s) => s.status === 'reversed')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(() => assertTransition(PAYMENT_TRANSITIONS, 'Payment', 'failed', 'paid')).toThrow(InvalidTransitionError);
    expect(() => assertTransition(PAYMENT_TRANSITIONS, 'Payment', 'refunded', 'paid')).toThrow(InvalidTransitionError);
  });
});

describe('partial cancellation', () => {
  it('refunds one line under its own policy and reverses only that settlement', () => {
    const { ledger } = pay();
    const target = ledger.bookings[0];
    const { ledger: after, refund } = cancelBooking(ledger, target.id, NOW, ids);
    expect(refund?.amount.amount).toBe(target.amount.amount);
    expect(after.bookings.find((b) => b.id === target.id)!.status).toBe('cancelled');
    expect(after.bookings.filter((b) => b.status === 'confirmed')).toHaveLength(2);
    expect(after.payments[0].status).toBe('partially_refunded');
    expect(after.settlements.find((s) => s.bookingId === target.id)!.status).toBe('reversed');
    expect(after.settlements.filter((s) => s.status === 'pending')).toHaveLength(2);
  });

  it('gives no refund inside the line policy window', () => {
    const { ledger } = pay();
    const target = ledger.bookings[0];
    const lateNow = new Date('2027-03-01T20:00:00Z'); // under 24 h before 09:00 on 2 March, Bali time
    const { ledger: after, refund } = cancelBooking(ledger, target.id, lateNow, ids);
    expect(refund).toBeNull();
    expect(after.bookings.find((b) => b.id === target.id)!.status).toBe('cancelled');
    expect(after.payments[0].status).toBe('paid');
  });

  it('marks the payment refunded once every line is refunded', () => {
    let { ledger } = pay();
    for (const booking of ledger.bookings) ledger = cancelBooking(ledger, booking.id, NOW, ids).ledger;
    expect(ledger.payments[0].status).toBe('refunded');
    expect(ledger.refunds).toHaveLength(3);
  });

  it('releases inventory held by cancelled bookings', () => {
    const { ledger } = pay();
    const booked = bookedFromLedger(ledger);
    expect(booked('exp-batik-ubud', '2027-03-02', '09:00')).toBe(2);
    expect(booked('evt-kecak-uluwatu:regular', '2027-03-02')).toBe(2);
    expect(booked('dr-avanza', '2027-03-02')).toBe(1);
    const after = cancelBooking(ledger, ledger.bookings[0].id, NOW, ids).ledger;
    expect(bookedFromLedger(after)('exp-batik-ubud', '2027-03-02', '09:00')).toBe(0);
  });
});
